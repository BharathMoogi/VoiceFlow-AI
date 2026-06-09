"""
Dashboard stats endpoint.

GET /dashboard/stats
    - Returns real-time stats and recent activity for the current user
    - Queries emails, conversations, and messages from the database
    - Requires JWT authentication
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.email import Email
from app.models.message import Message
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/stats",
    summary="Get dashboard statistics",
    description=(
        "Returns real-time statistics for the current user including "
        "total emails, conversations, transcriptions (messages), "
        "and recent activity feed."
    ),
    tags=["dashboard"],
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Fetch real dashboard stats for the authenticated user.

    Returns:
        - stats: total counts + weekly/daily deltas
        - recent_activity: last 10 actions
        - user info: name, pending drafts
    """
    user_id = current_user.id
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # ── Total counts ──────────────────────────────────────────────────
    # Emails
    total_emails_result = await db.execute(
        select(func.count(Email.id)).where(Email.user_id == user_id)
    )
    total_emails = total_emails_result.scalar() or 0

    # Sent emails
    sent_emails_result = await db.execute(
        select(func.count(Email.id)).where(
            and_(Email.user_id == user_id, Email.status == "sent")
        )
    )
    sent_emails = sent_emails_result.scalar() or 0

    # Emails this week
    emails_this_week_result = await db.execute(
        select(func.count(Email.id)).where(
            and_(Email.user_id == user_id, Email.created_at >= week_ago)
        )
    )
    emails_this_week = emails_this_week_result.scalar() or 0

    # Conversations
    total_conversations_result = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
    )
    total_conversations = total_conversations_result.scalar() or 0

    # Conversations today
    conversations_today_result = await db.execute(
        select(func.count(Conversation.id)).where(
            and_(Conversation.user_id == user_id, Conversation.created_at >= today_start)
        )
    )
    conversations_today = conversations_today_result.scalar() or 0

    # Messages (transcriptions) — messages in user's conversations
    total_messages_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.user_id == user_id)
            )
        )
    )
    total_messages = total_messages_result.scalar() or 0

    # Messages this week
    messages_this_week_result = await db.execute(
        select(func.count(Message.id)).where(
            and_(
                Message.conversation_id.in_(
                    select(Conversation.id).where(Conversation.user_id == user_id)
                ),
                Message.timestamp >= week_ago,
            )
        )
    )
    messages_this_week = messages_this_week_result.scalar() or 0

    # Draft emails count
    draft_emails_result = await db.execute(
        select(func.count(Email.id)).where(
            and_(Email.user_id == user_id, Email.status.in_(["draft", "pending"]))
        )
    )
    draft_count = draft_emails_result.scalar() or 0

    # Success rate (sent / total * 100) if there are emails
    success_rate = round((sent_emails / total_emails * 100), 1) if total_emails > 0 else 0.0

    # ── Recent activity feed ──────────────────────────────────────────
    # Combine recent emails + conversations, sorted by time
    recent_items: List[Dict[str, Any]] = []

    # Recent emails
    recent_emails_result = await db.execute(
        select(Email)
        .where(Email.user_id == user_id)
        .order_by(Email.created_at.desc())
        .limit(5)
    )
    for email_row in recent_emails_result.scalars().all():
        if email_row.status == "sent":
            activity_type = "email_sent"
            title = f"Email Sent: {email_row.subject[:50]}"
        else:
            activity_type = "draft"
            title = f"Email Draft: {email_row.subject[:50]}"

        recent_items.append({
            "id": str(email_row.id),
            "type": activity_type,
            "title": title,
            "desc": f"To: {email_row.recipient}" if email_row.recipient else "No recipient",
            "time": _relative_time(email_row.created_at, now),
            "created_at": email_row.created_at.isoformat() if email_row.created_at else None,
        })

    # Recent conversations
    recent_convos_result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
        .limit(5)
    )
    for convo in recent_convos_result.scalars().all():
        recent_items.append({
            "id": str(convo.id),
            "type": "conversation",
            "title": f"Conversation: {convo.title[:50]}" if convo.title else "New Conversation",
            "desc": f"\"{convo.title}\"" if convo.title else "Untitled conversation",
            "time": _relative_time(convo.created_at, now),
            "created_at": convo.created_at.isoformat() if convo.created_at else None,
        })

    # Sort combined activity by created_at descending, take top 10
    recent_items.sort(
        key=lambda x: x.get("created_at") or "",
        reverse=True,
    )
    recent_activity = recent_items[:10]

    # Remove created_at from output (only used for sorting)
    for item in recent_activity:
        item.pop("created_at", None)

    return {
        "stats": {
            "transcriptions": total_messages,
            "transcriptions_change": f"+{messages_this_week} this week",
            "emails_sent": sent_emails,
            "emails_sent_change": f"+{emails_this_week} this week",
            "conversations": total_conversations,
            "conversations_change": f"+{conversations_today} today",
            "success_rate": success_rate,
            "success_rate_label": "All-time" if total_emails > 0 else "No data yet",
        },
        "recent_activity": recent_activity,
        "user": {
            "name": current_user.full_name or current_user.email,
            "draft_count": draft_count,
        },
    }


def _relative_time(dt: datetime | None, now: datetime) -> str:
    """Convert a datetime to a human-readable relative time string."""
    if dt is None:
        return "Unknown"

    # Ensure both are timezone-aware for comparison
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    diff = now - dt
    seconds = int(diff.total_seconds())

    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        mins = seconds // 60
        return f"{mins} min ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hr ago"
    elif seconds < 172800:
        return "Yesterday"
    else:
        days = seconds // 86400
        return f"{days} days ago"

"""Initial migration: create user, conversation, message, and email tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-06-07 00:00:00.000000

Tables created:
  - user           (id INTEGER PK, full_name, email, hashed_password, is_active, is_superuser)
  - conversation   (id UUID PK, user_id FK→user, title, created_at, updated_at)
  - message        (id UUID PK, conversation_id FK→conversation, sender, content, timestamp)
  - email          (id UUID PK, user_id FK→user, recipient, subject, body, status, created_at)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# ---------------------------------------------------------------------------
# Revision metadata
# ---------------------------------------------------------------------------
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Upgrade: create all tables in dependency order
# ---------------------------------------------------------------------------
def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. user  (no FK dependencies — must be created first)
    # ------------------------------------------------------------------
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
        sa.Column("is_superuser", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_id"), "user", ["id"], unique=False)
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)
    op.create_index(op.f("ix_user_full_name"), "user", ["full_name"], unique=False)

    # ------------------------------------------------------------------
    # 2. conversation  (FK → user)
    # ------------------------------------------------------------------
    op.create_table(
        "conversation",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_conversation_id"), "conversation", ["id"], unique=False)
    op.create_index(op.f("ix_conversation_user_id"), "conversation", ["user_id"], unique=False)
    op.create_index(op.f("ix_conversation_title"), "conversation", ["title"], unique=False)

    # ------------------------------------------------------------------
    # 3. message  (FK → conversation)
    # ------------------------------------------------------------------
    op.create_table(
        "message",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversation.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_message_id"), "message", ["id"], unique=False)
    op.create_index(
        op.f("ix_message_conversation_id"), "message", ["conversation_id"], unique=False
    )
    op.create_index(op.f("ix_message_sender"), "message", ["sender"], unique=False)

    # ------------------------------------------------------------------
    # 4. email  (FK → user)
    # ------------------------------------------------------------------
    op.create_table(
        "email",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("recipient", sa.String(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True, server_default=sa.text("'draft'")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_id"), "email", ["id"], unique=False)
    op.create_index(op.f("ix_email_user_id"), "email", ["user_id"], unique=False)
    op.create_index(op.f("ix_email_recipient"), "email", ["recipient"], unique=False)
    op.create_index(op.f("ix_email_status"), "email", ["status"], unique=False)


# ---------------------------------------------------------------------------
# Downgrade: drop all tables in reverse dependency order
# ---------------------------------------------------------------------------
def downgrade() -> None:
    # email (no dependents)
    op.drop_index(op.f("ix_email_status"), table_name="email")
    op.drop_index(op.f("ix_email_recipient"), table_name="email")
    op.drop_index(op.f("ix_email_user_id"), table_name="email")
    op.drop_index(op.f("ix_email_id"), table_name="email")
    op.drop_table("email")

    # message (depends on conversation)
    op.drop_index(op.f("ix_message_sender"), table_name="message")
    op.drop_index(op.f("ix_message_conversation_id"), table_name="message")
    op.drop_index(op.f("ix_message_id"), table_name="message")
    op.drop_table("message")

    # conversation (depends on user)
    op.drop_index(op.f("ix_conversation_title"), table_name="conversation")
    op.drop_index(op.f("ix_conversation_user_id"), table_name="conversation")
    op.drop_index(op.f("ix_conversation_id"), table_name="conversation")
    op.drop_table("conversation")

    # user (root table)
    op.drop_index(op.f("ix_user_full_name"), table_name="user")
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_index(op.f("ix_user_id"), table_name="user")
    op.drop_table("user")

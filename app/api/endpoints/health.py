"""
Health check endpoints for VoiceFlow-AI.

GET /health
    - Lightweight liveness probe — confirms the API process is running.
    - No external dependencies checked.
    - Suitable for load balancer / container liveness checks.

GET /health/database
    - Readiness probe — verifies live connectivity to the PostgreSQL database.
    - Executes a minimal SQL query (SELECT 1) through the async engine.
    - Returns 503 if the database is unreachable.
    - Suitable for Kubernetes readiness probes / uptime monitors.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

# Capture the moment the process started (used to report uptime)
_PROCESS_START: float = time.monotonic()


def _uptime_seconds() -> float:
    return round(time.monotonic() - _PROCESS_START, 2)


# ---------------------------------------------------------------------------
# GET /health  — liveness probe
# ---------------------------------------------------------------------------

@router.get(
    "",
    summary="API liveness check",
    description=(
        "Lightweight probe that confirms the API process is running. "
        "No external services are checked. "
        "Always returns 200 while the server is alive."
    ),
    tags=["health"],
)
async def health_check() -> Dict[str, Any]:
    """
    Liveness probe.

    Returns:
        ```json
        {
          "status": "ok",
          "service": "VoiceFlow-AI",
          "timestamp": "2024-06-07T10:00:00Z",
          "uptime_seconds": 3600.5
        }
        ```
    """
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": _uptime_seconds(),
    }


# ---------------------------------------------------------------------------
# GET /health/database  — readiness probe
# ---------------------------------------------------------------------------

@router.get(
    "/database",
    summary="Database readiness check",
    description=(
        "Readiness probe that verifies live connectivity to the PostgreSQL "
        "database by executing a lightweight `SELECT 1` query. "
        "Returns 200 when the database is reachable, 503 otherwise."
    ),
    tags=["health"],
)
async def health_database(
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Database readiness probe.

    Attempts a `SELECT 1` query via the async SQLAlchemy session.
    Returns 200 on success, 503 on any connectivity failure.

    Returns (success):
        ```json
        {
          "status": "ok",
          "database": "connected",
          "response_time_ms": 4.2,
          "timestamp": "2024-06-07T10:00:00Z"
        }
        ```

    Returns (failure):
        ```json
        {
          "status": "error",
          "database": "unreachable",
          "detail": "<error message>",
          "timestamp": "2024-06-07T10:00:00Z"
        }
        ```
    """
    start = time.monotonic()
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        await db.execute(text("SELECT 1"))
        response_ms = round((time.monotonic() - start) * 1000, 2)

        logger.debug("Health/database: OK (%.2f ms)", response_ms)

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "ok",
                "database": "connected",
                "response_time_ms": response_ms,
                "timestamp": timestamp,
            },
        )

    except Exception as exc:
        response_ms = round((time.monotonic() - start) * 1000, 2)
        error_detail = str(exc)

        logger.error(
            "Health/database: UNREACHABLE after %.2f ms — %s",
            response_ms,
            error_detail,
        )

        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "unreachable",
                "detail": error_detail,
                "response_time_ms": response_ms,
                "timestamp": timestamp,
            },
        )

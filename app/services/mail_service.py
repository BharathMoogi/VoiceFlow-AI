"""
SMTP Mail Service for VoiceFlow-AI.

Provides async email sending via Python's standard `smtplib`,
wrapped in asyncio's `run_in_executor` so it never blocks the
event loop.

Features:
  - Async (non-blocking) — smtplib runs in a thread-pool executor
  - Retries with exponential backoff for transient network/SMTP errors
  - STARTTLS (port 587) and SSL (port 465) support
  - Granular exception handling mapped to FastAPI HTTP errors
  - Structured logging at every stage

Configuration (loaded from environment via app.core.config.settings):
    SMTP_HOST        — SMTP server hostname     (default: smtp.gmail.com)
    SMTP_PORT        — SMTP server port         (default: 587)
    SMTP_USERNAME    — SMTP login username
    SMTP_PASSWORD    — SMTP login password / app-password
    SMTP_FROM_EMAIL  — Sender address in the From header
    SMTP_USE_TLS     — Use STARTTLS             (default: True)
    SMTP_USE_SSL     — Use SSL/TLS              (default: False)

Usage:
    from app.services.mail_service import mail_service

    await mail_service.send_email(
        recipient="user@example.com",
        subject="Hello",
        body="<h1>Hello from VoiceFlow-AI</h1>",
        html=True,
    )
"""

import asyncio
import logging
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import partial
from typing import Optional, Tuple, Type, List, Dict

from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Retry configuration
# ---------------------------------------------------------------------------

# Exception types that are worth retrying (transient network / server errors).
# Auth failures and bad recipient are NOT retried — they won't change.
_RETRYABLE_EXCEPTIONS: Tuple[Type[Exception], ...] = (
    smtplib.SMTPConnectError,
    smtplib.SMTPServerDisconnected,
    smtplib.SMTPHeloError,
    smtplib.SMTPDataError,
    ConnectionRefusedError,
    TimeoutError,
    OSError,
)

DEFAULT_MAX_RETRIES: int = 3          # total attempts (1 initial + 2 retries)
DEFAULT_BACKOFF_BASE: float = 1.5     # seconds — doubles each attempt (1.5 → 3 → 6)


# ---------------------------------------------------------------------------
# MailService
# ---------------------------------------------------------------------------

class MailService:
    """
    Async SMTP email service with retry support.

    All blocking smtplib calls are offloaded to a thread-pool executor
    so they don't stall the FastAPI event loop.
    """

    def __init__(
        self,
        max_retries: int = DEFAULT_MAX_RETRIES,
        backoff_base: float = DEFAULT_BACKOFF_BASE,
    ) -> None:
        """
        Args:
            max_retries:  Maximum number of send attempts (default 3).
            backoff_base: Base delay in seconds between retries (doubles each attempt).
        """
        self.max_retries = max_retries
        self.backoff_base = backoff_base

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _check_config(self) -> None:
        """
        Raise HTTP 503 immediately if any required SMTP credential is missing.
        Prevents wasting a connection attempt when config is clearly wrong.
        """
        missing = [
            name
            for name, value in {
                "SMTP_USERNAME": settings.SMTP_USERNAME,
                "SMTP_PASSWORD": settings.SMTP_PASSWORD,
                "SMTP_FROM_EMAIL": settings.SMTP_FROM_EMAIL,
            }.items()
            if not value
        ]
        if missing:
            logger.error("MailService: missing SMTP config: %s", missing)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "SMTP service is not configured. "
                    f"Missing environment variables: {', '.join(missing)}."
                ),
            )

    def _build_message(
        self,
        recipient: str,
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
    ) -> MIMEMultipart:
        """
        Construct a MIME email message.

        Args:
            recipient: Primary destination address.
            subject:   Subject line.
            body:      Body text (plain or HTML).
            html:      Send as text/html when True; text/plain otherwise.
            cc:        Optional CC address added to the CC header.
            attachments: Optional list of attachments containing name and url.

        Returns:
            Populated MIMEMultipart object ready to send.
        """
        if attachments:
            msg = MIMEMultipart("mixed")
            body_container = MIMEMultipart("alternative")
            subtype = "html" if html else "plain"
            body_container.attach(MIMEText(body, subtype, "utf-8"))
            msg.attach(body_container)
            
            for att in attachments:
                file_url = att.get("url")
                file_name = att.get("name") or "attachment"
                if not file_url:
                    continue
                try:
                    import urllib.request
                    from email.mime.base import MIMEBase
                    from email import encoders
                    
                    req = urllib.request.Request(
                        file_url, 
                        headers={'User-Agent': 'Mozilla/5.0'}
                    )
                    with urllib.request.urlopen(req, timeout=15) as response:
                        file_bytes = response.read()
                    
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(file_bytes)
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition", 
                        f'attachment; filename="{file_name}"'
                    )
                    msg.attach(part)
                except Exception as e:
                    logger.error(f"MailService: failed to download/attach file '{file_name}' from {file_url}: {e}")
        else:
            msg = MIMEMultipart("alternative")
            subtype = "html" if html else "plain"
            msg.attach(MIMEText(body, subtype, "utf-8"))

        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = recipient
        msg["Subject"] = subject
        if cc:
            msg["Cc"] = cc
        return msg

    def _connect_and_send(self, raw_message: str, recipient: str) -> None:
        """
        Open an SMTP connection, authenticate, and send one message.

        Supports both STARTTLS (port 587) and direct SSL (port 465).
        This method does NOT retry — retry logic lives in _send_with_retry.

        Raises:
            smtplib.SMTPException subclasses on SMTP-level failures.
            OSError / TimeoutError on network-level failures.
        """
        host = settings.SMTP_HOST
        port = settings.SMTP_PORT

        logger.debug(
            "MailService: connecting → %s:%s  TLS=%s  SSL=%s",
            host, port, settings.SMTP_USE_TLS, settings.SMTP_USE_SSL,
        )

        if settings.SMTP_USE_SSL:
            # Direct SSL on port 465
            with smtplib.SMTP_SSL(host, port, timeout=10) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, recipient, raw_message)
        else:
            # Plain socket upgraded with STARTTLS on port 587
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.ehlo()
                if settings.SMTP_USE_TLS:
                    server.starttls()
                    server.ehlo()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, recipient, raw_message)

    def _send_with_retry(
        self,
        recipient: str,
        subject: str,
        raw_message: str,
    ) -> None:
        """
        Synchronous send with exponential backoff retry.

        Runs inside a thread-pool executor (never call directly from async code).

        Retry policy:
          - Only transient errors (_RETRYABLE_EXCEPTIONS) trigger a retry.
          - Auth failures and bad-recipient errors are raised immediately.
          - Delays: 1.5 s → 3 s → 6 s (backoff_base doubles each attempt).

        Args:
            recipient:    Destination address (for logging).
            subject:      Subject line (for logging).
            raw_message:  Pre-serialised MIME string.

        Raises:
            The last exception raised after all retry attempts are exhausted.
        """
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                self._connect_and_send(raw_message, recipient)
                logger.info(
                    "MailService: ✓ sent to '%s' | subject='%s' | attempt %d/%d",
                    recipient, subject, attempt, self.max_retries,
                )
                return  # success — exit retry loop

            # --- Non-retryable: bad credentials ---
            except smtplib.SMTPAuthenticationError as exc:
                logger.error(
                    "MailService: auth failed (user='%s') — not retrying. %s",
                    settings.SMTP_USERNAME, exc,
                )
                raise

            # --- Non-retryable: server rejected this specific recipient ---
            except smtplib.SMTPRecipientsRefused as exc:
                logger.error(
                    "MailService: recipient '%s' refused — not retrying. %s",
                    recipient, exc,
                )
                raise

            # --- Retryable: transient network / server error ---
            except _RETRYABLE_EXCEPTIONS as exc:
                last_exc = exc
                if attempt < self.max_retries:
                    delay = self.backoff_base * (2 ** (attempt - 1))
                    logger.warning(
                        "MailService: attempt %d/%d failed (%s: %s). "
                        "Retrying in %.1f s…",
                        attempt, self.max_retries,
                        type(exc).__name__, exc,
                        delay,
                    )
                    time.sleep(delay)
                else:
                    logger.error(
                        "MailService: all %d attempts exhausted for '%s'. Last error: %s",
                        self.max_retries, recipient, exc,
                    )

            # --- Retryable: any other smtplib error ---
            except smtplib.SMTPException as exc:
                last_exc = exc
                if attempt < self.max_retries:
                    delay = self.backoff_base * (2 ** (attempt - 1))
                    logger.warning(
                        "MailService: SMTP error on attempt %d/%d (%s). Retrying in %.1f s…",
                        attempt, self.max_retries, exc, delay,
                    )
                    time.sleep(delay)
                else:
                    logger.error(
                        "MailService: all %d attempts exhausted. Last SMTP error: %s",
                        self.max_retries, exc,
                    )

        # All retries exhausted — raise the last error
        raise last_exc  # type: ignore[misc]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def send_email(
        self,
        recipient: str,
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
    ) -> None:
        """
        Send an email asynchronously via SMTP with automatic retries.

        The blocking smtplib calls run in a thread-pool executor so the
        FastAPI event loop is never blocked. Up to ``max_retries`` attempts
        are made for transient failures, with exponential backoff between them.

        Args:
            recipient: Destination email address.
            subject:   Subject line.
            body:      Body — plain text by default; HTML when ``html=True``.
            html:      Send body as text/html.
            cc:        Optional CC address added to message headers.
            attachments: Optional list of attachments containing name and url.

        Raises:
            HTTPException 503: SMTP credentials not configured.
            HTTPException 502: Auth failure, connection error, or SMTP error
                               after all retries exhausted.
            HTTPException 400: Recipient refused by the SMTP server.
            HTTPException 500: Unexpected non-SMTP error.
        """
        # Step 1 — fail fast if config is incomplete
        self._check_config()

        # Step 2 — build the MIME message (cheap, run in-thread)
        msg = self._build_message(recipient, subject, body, html, cc, attachments)
        raw_message = msg.as_string()

        logger.info(
            "MailService: queuing send → '%s' | subject='%s' | html=%s | retries=%d",
            recipient, subject, html, self.max_retries,
        )

        # Step 3 — offload blocking SMTP work to thread-pool with retries
        loop = asyncio.get_event_loop()
        send_fn = partial(self._send_with_retry, recipient, subject, raw_message)

        try:
            await loop.run_in_executor(None, send_fn)

        except smtplib.SMTPAuthenticationError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "SMTP authentication failed. "
                    "Verify SMTP_USERNAME and SMTP_PASSWORD in your configuration."
                ),
            )

        except smtplib.SMTPRecipientsRefused:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Recipient '{recipient}' was refused by the SMTP server.",
            )

        except (smtplib.SMTPException, *_RETRYABLE_EXCEPTIONS) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    f"Failed to send email after {self.max_retries} attempt(s). "
                    f"Error: {exc}"
                ),
            )

        except Exception as exc:
            logger.exception(
                "MailService: unexpected error sending to '%s': %s", recipient, exc
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred while sending the email.",
            ) from exc


# ---------------------------------------------------------------------------
# Singleton — import and use this in endpoints and other services
# ---------------------------------------------------------------------------

mail_service = MailService()

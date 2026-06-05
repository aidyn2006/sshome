import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings


logger = logging.getLogger(__name__)


def send_password_reset_code(email: str, code: str, expires_in_minutes: int) -> None:
    if not settings.smtp_host:
        logger.info(
            "Password reset code for %s is %s. Configure SMTP_HOST to send emails.",
            email,
            code,
        )
        return

    message = EmailMessage()
    message["Subject"] = "SSHome password reset code"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        "\n".join(
            [
                "Use this code to reset your SSHome password:",
                "",
                code,
                "",
                f"The code expires in {expires_in_minutes} minutes.",
                "If you did not request a password reset, ignore this email.",
            ]
        )
    )

    if settings.smtp_use_ssl:
        with smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
        ) as smtp:
            _send_message(smtp, message)
        return

    with smtplib.SMTP(
        settings.smtp_host,
        settings.smtp_port,
        timeout=settings.smtp_timeout_seconds,
    ) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        _send_message(smtp, message)


def _send_message(smtp: smtplib.SMTP, message: EmailMessage) -> None:
    if settings.smtp_username and settings.smtp_password:
        smtp.login(settings.smtp_username, settings.smtp_password)
    smtp.send_message(message)

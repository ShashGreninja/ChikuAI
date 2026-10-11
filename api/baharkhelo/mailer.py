"""Send the school report by email through Amazon SES.

Needs SES_SENDER (a verified SES identity) and an AWS role or credentials allowed to call
ses:SendRawEmail. While the SES account is in the sandbox, recipients must be verified too.
"""
from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from email.message import EmailMessage

MAX_RECIPIENTS = 10
_WINDOW, _LIMIT = 3600, 10  # at most 10 sends per hour per client
_recent: dict[str, deque] = defaultdict(deque)


class MailError(RuntimeError):
    pass


def enabled() -> bool:
    return bool(os.getenv("SES_SENDER"))


def allow(client: str) -> bool:
    q, now = _recent[client], time.time()
    while q and now - q[0] > _WINDOW:
        q.popleft()
    if len(q) >= _LIMIT:
        return False
    q.append(now)
    return True


def send_report(to: list[str], subject: str, body: str, pdf: bytes, filename: str) -> None:
    sender = os.getenv("SES_SENDER")
    if not sender:
        raise MailError("Email isn't set up on this server")
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"Bahar Khelo <{sender}>"
    msg["To"] = ", ".join(to)
    msg.set_content(body)
    msg.add_attachment(pdf, maintype="application", subtype="pdf", filename=filename)

    import boto3  # installed with strands-agents
    try:
        boto3.client("sesv2", region_name=os.getenv("AWS_REGION", "ap-south-1")).send_email(
            FromEmailAddress=sender,
            Destination={"ToAddresses": to},
            Content={"Raw": {"Data": msg.as_bytes()}},
        )
    except Exception as e:  # botocore errors carry the SES reason
        raise MailError(str(e)) from e

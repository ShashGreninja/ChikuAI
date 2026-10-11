"""Outbound "call me" requests through Twilio, with the guard rails a public button needs.

Configuration (all required to switch calls on):
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN  from the Twilio console
  TWILIO_FROM_NUMBER                     a Twilio voice number, E.164 (+1...)
  PUBLIC_BASE_URL                        where Twilio can reach this API, e.g. the App Runner URL
Optional:
  CALL_DAILY_CAP                         max calls per day across everyone (default 50)
"""
from __future__ import annotations

import os
import re
import time
from collections import defaultdict, deque

INDIAN_MOBILE = re.compile(r"^\+91[6-9]\d{9}$")

_by_number: dict[str, deque] = defaultdict(deque)
_by_client: dict[str, deque] = defaultdict(deque)
_all: deque = deque()


class CallError(RuntimeError):
    pass


def enabled() -> bool:
    return all(os.getenv(k) for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER",
                                      "PUBLIC_BASE_URL"))


def base_url() -> str:
    return os.getenv("PUBLIC_BASE_URL", "").rstrip("/")


def normalise(raw: str) -> str | None:
    """Accept 98xxxxxxxx, 098..., 9198..., +91 98... and return +9198xxxxxxxx, or None."""
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 10:
        digits = "91" + digits
    elif len(digits) == 11 and digits.startswith("0"):
        digits = "91" + digits[1:]
    num = "+" + digits
    return num if INDIAN_MOBILE.match(num) else None


def masked(num: str) -> str:
    return f"{num[:3]} {'x' * 6}{num[-4:]}"


def _hit(q: deque, window: float, limit: int, now: float) -> bool:
    while q and now - q[0] > window:
        q.popleft()
    return len(q) >= limit


def check_limits(number: str, client: str) -> str | None:
    """Return a reason to refuse, or None. Records the attempt when allowed."""
    now = time.time()
    if _hit(_by_number[number], 600, 1, now):
        return "We just called this number. Please wait a few minutes before asking again."
    if _hit(_by_client[client], 3600, 5, now):
        return "Too many call requests from here. Try again in an hour."
    if _hit(_all, 86400, int(os.getenv("CALL_DAILY_CAP", "50")), now):
        return "Chiku has made all the calls it can today. Please use the website for now."
    for q in (_by_number[number], _by_client[client], _all):
        q.append(now)
    return None


def place_call(number: str, lang: str) -> str:
    """Ask Twilio to ring the parent. Returns the call SID."""
    from twilio.base.exceptions import TwilioRestException
    from twilio.rest import Client

    client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
    try:
        call = client.calls.create(
            to=number,
            from_=os.environ["TWILIO_FROM_NUMBER"],
            url=f"{base_url()}/api/voice/start?lang={lang}",
            method="POST",
            timeout=30,
        )
    except TwilioRestException as e:
        raise CallError(e.msg) from e
    return call.sid


def valid_signature(url: str, params: dict[str, str], signature: str) -> bool:
    """Check that a webhook really came from Twilio."""
    from twilio.request_validator import RequestValidator

    token = os.getenv("TWILIO_AUTH_TOKEN")
    if not token:
        return False
    return RequestValidator(token).validate(url, params, signature)

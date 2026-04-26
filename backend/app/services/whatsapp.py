from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from ..config import get_settings


@dataclass
class SendResult:
    ok: bool
    sid: str | None = None
    error: str | None = None


class EventLike(Protocol):
    title: str
    start_at: datetime
    location: str | None
    client_name: str | None
    description: str | None


class CrewLike(Protocol):
    name: str
    phone: str


def render_assignment_message(crew: CrewLike, event: EventLike) -> str:
    when = event.start_at.strftime("%a %b %d, %Y at %I:%M %p")
    lines = [
        f"Hi {crew.name}! You've been booked for an event with 360 Events Aruba:",
        "",
        f"Event: {event.title}",
        f"When: {when}",
    ]
    if event.location:
        lines.append(f"Where: {event.location}")
    if event.client_name:
        lines.append(f"Client: {event.client_name}")
    if event.description:
        lines.append("")
        lines.append(f"Details: {event.description}")
    lines.append("")
    lines.append("Reply CONFIRM to accept or DECLINE if unavailable. Masha danki!")
    return "\n".join(lines)


def _client() -> Client:
    s = get_settings()
    if not s.twilio_account_sid or not s.twilio_auth_token:
        raise RuntimeError("Twilio credentials not configured")
    return Client(s.twilio_account_sid, s.twilio_auth_token)


def send_assignment(crew: CrewLike, event: EventLike) -> SendResult:
    settings = get_settings()
    body = render_assignment_message(crew, event)
    to = crew.phone if crew.phone.startswith("whatsapp:") else f"whatsapp:{crew.phone}"
    try:
        msg = _client().messages.create(
            from_=settings.twilio_whatsapp_from,
            to=to,
            body=body,
        )
        return SendResult(ok=True, sid=msg.sid)
    except TwilioRestException as e:
        return SendResult(ok=False, error=f"{e.code}: {e.msg}")
    except Exception as e:
        return SendResult(ok=False, error=str(e))

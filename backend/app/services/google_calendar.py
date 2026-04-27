from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Event, GoogleOAuth


def _get_credentials(db: Session) -> Any | None:
    """Return a valid Credentials object, refreshing if needed. None if not connected."""
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    record = db.query(GoogleOAuth).first()
    if not record:
        return None

    s = get_settings()
    creds = Credentials(
        token=record.access_token,
        refresh_token=record.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=s.google_client_id,
        client_secret=s.google_client_secret,
    )
    if record.token_expiry:
        creds.expiry = record.token_expiry.replace(tzinfo=timezone.utc)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        record.access_token = creds.token
        if creds.expiry:
            record.token_expiry = creds.expiry.replace(tzinfo=None)
        db.commit()

    return creds


def _service(creds: Any) -> Any:
    from googleapiclient.discovery import build
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _event_body(event: Event, attendee_emails: list[str]) -> dict:
    summary = event.title
    if event.client_name:
        summary = f"{event.title} — {event.client_name}"
    return {
        "summary": summary,
        "location": event.location or "",
        "description": event.description or "",
        "start": {
            "dateTime": event.start_at.strftime("%Y-%m-%dT%H:%M:%S"),
            "timeZone": "America/Aruba",
        },
        "end": {
            "dateTime": event.end_at.strftime("%Y-%m-%dT%H:%M:%S"),
            "timeZone": "America/Aruba",
        },
        "attendees": [{"email": e} for e in attendee_emails if e],
        "guestsCanModify": False,
        "guestsCanInviteOthers": False,
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 24 * 60},
                {"method": "popup", "minutes": 60},
            ],
        },
    }


def _calendar_id(db: Session) -> str:
    record = db.query(GoogleOAuth).first()
    return record.calendar_id if record else "primary"


def create_event(db: Session, event: Event, attendee_emails: list[str]) -> str | None:
    """Creates a Google Calendar event. Returns the Google event ID, or None on failure."""
    creds = _get_credentials(db)
    if not creds:
        return None
    try:
        body = _event_body(event, attendee_emails)
        result = (
            _service(creds)
            .events()
            .insert(calendarId=_calendar_id(db), body=body, sendUpdates="all")
            .execute()
        )
        return result.get("id")
    except Exception:
        return None


def update_event(db: Session, google_event_id: str, event: Event, attendee_emails: list[str]) -> str | None:
    """Updates an existing Google Calendar event. Returns error string or None."""
    creds = _get_credentials(db)
    if not creds:
        return None
    try:
        body = _event_body(event, attendee_emails)
        _service(creds).events().update(
            calendarId=_calendar_id(db),
            eventId=google_event_id,
            body=body,
            sendUpdates="all",
        ).execute()
        return None
    except Exception as e:
        return str(e)


def delete_event(db: Session, google_event_id: str) -> None:
    """Deletes a Google Calendar event, cancelling attendee invites."""
    creds = _get_credentials(db)
    if not creds:
        return
    try:
        _service(creds).events().delete(
            calendarId=_calendar_id(db),
            eventId=google_event_id,
            sendUpdates="all",
        ).execute()
    except Exception:
        pass

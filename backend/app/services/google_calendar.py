import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Event, GoogleOAuth

log = logging.getLogger(__name__)


def _get_credentials(db: Session) -> Any:
    """Return a valid Credentials object, refreshing if needed. Raises RuntimeError if not connected."""
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    record = db.query(GoogleOAuth).first()
    if not record:
        raise RuntimeError("Google Calendar not connected — go to Settings to connect")

    s = get_settings()
    creds = Credentials(
        token=record.access_token,
        refresh_token=record.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=s.google_client_id,
        client_secret=s.google_client_secret,
    )
    if record.token_expiry:
        creds.expiry = record.token_expiry  # stored as naive UTC; google-auth expects naive UTC

    if creds.expired and creds.refresh_token:
        log.info("Google Calendar: refreshing expired token")
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


def create_event(db: Session, event: Event, attendee_emails: list[str]) -> str:
    """Creates a Google Calendar event. Returns the Google event ID. Raises on failure."""
    creds = _get_credentials(db)
    body = _event_body(event, attendee_emails)
    log.info("Google Calendar: creating event '%s' with attendees %s", event.title, attendee_emails)
    result = (
        _service(creds)
        .events()
        .insert(calendarId=_calendar_id(db), body=body, sendUpdates="all")
        .execute()
    )
    gcal_id = result.get("id")
    log.info("Google Calendar: created event id=%s", gcal_id)
    return gcal_id


def update_event(db: Session, google_event_id: str, event: Event, attendee_emails: list[str]) -> None:
    """Updates an existing Google Calendar event. Raises on failure."""
    creds = _get_credentials(db)
    body = _event_body(event, attendee_emails)
    log.info("Google Calendar: updating event id=%s attendees=%s", google_event_id, attendee_emails)
    _service(creds).events().update(
        calendarId=_calendar_id(db),
        eventId=google_event_id,
        body=body,
        sendUpdates="all",
    ).execute()
    log.info("Google Calendar: update_event ok")


def delete_event(db: Session, google_event_id: str) -> None:
    """Deletes a Google Calendar event, cancelling attendee invites. Logs but does not raise."""
    try:
        creds = _get_credentials(db)
        _service(creds).events().delete(
            calendarId=_calendar_id(db),
            eventId=google_event_id,
            sendUpdates="all",
        ).execute()
        log.info("Google Calendar: deleted event id=%s", google_event_id)
    except Exception as e:
        log.error("Google Calendar: delete_event failed: %s", e)

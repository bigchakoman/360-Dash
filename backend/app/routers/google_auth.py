from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..config import get_settings
from ..db import get_db
from ..models import GoogleOAuth
from ..schemas import GoogleCalendarStatus

router = APIRouter(prefix="/auth/google", tags=["google-auth"])

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
]


def _flow(redirect_uri: str | None = None):
    from google_auth_oauthlib.flow import Flow

    s = get_settings()
    if not s.google_client_id or not s.google_client_secret:
        raise HTTPException(400, "Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri or s.google_redirect_uri],
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri or s.google_redirect_uri,
    )
    return flow


@router.get("/status", response_model=GoogleCalendarStatus, dependencies=[Depends(get_current_admin)])
def google_status(db: Session = Depends(get_db)) -> GoogleCalendarStatus:
    record = db.query(GoogleOAuth).first()
    if not record:
        return GoogleCalendarStatus(connected=False)
    return GoogleCalendarStatus(
        connected=True,
        owner_email=record.owner_email,
        calendar_id=record.calendar_id,
    )


@router.get("/connect", dependencies=[Depends(get_current_admin)])
def google_connect(db: Session = Depends(get_db)):
    """Returns the Google OAuth authorization URL for the frontend to redirect to."""
    flow = _flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    return {"auth_url": auth_url}


@router.get("/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    """Exchanges the authorization code for tokens and stores them."""
    s = get_settings()
    flow = _flow()
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(400, f"Token exchange failed: {e}")

    creds = flow.credentials

    # Fetch the owner's email via the userinfo endpoint
    owner_email: str | None = None
    try:
        import httpx
        r = httpx.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {creds.token}"},
            timeout=10,
        )
        if r.status_code == 200:
            owner_email = r.json().get("email")
    except Exception:
        pass

    expiry = creds.expiry
    expiry_naive = expiry.replace(tzinfo=None) if expiry and expiry.tzinfo else expiry

    record = db.query(GoogleOAuth).first()
    if record:
        record.access_token = creds.token
        record.refresh_token = creds.refresh_token or record.refresh_token
        record.token_expiry = expiry_naive
        if owner_email:
            record.owner_email = owner_email
    else:
        record = GoogleOAuth(
            access_token=creds.token,
            refresh_token=creds.refresh_token or "",
            token_expiry=expiry_naive,
            calendar_id="primary",
            owner_email=owner_email,
        )
        db.add(record)
    db.commit()

    return RedirectResponse(url=f"{s.frontend_url}/settings?connected=1")


@router.delete("/disconnect", status_code=204, dependencies=[Depends(get_current_admin)])
def google_disconnect(db: Session = Depends(get_db)) -> None:
    record = db.query(GoogleOAuth).first()
    if record:
        db.delete(record)
        db.commit()

"""CLI WhatsApp sender — WAT-compatible deterministic tool.

Usage:
    python tools/send_whatsapp.py --to +13055551234 --body "Hello from 360 Events"

Reads Twilio creds from backend/.env (or environment).
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Allow importing the backend service module
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(ROOT / "backend" / ".env")

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException


def main() -> int:
    p = argparse.ArgumentParser(description="Send a WhatsApp message via Twilio")
    p.add_argument("--to", required=True, help="Recipient phone in E.164 (e.g. +13055551234)")
    p.add_argument("--body", required=True, help="Message body")
    args = p.parse_args()

    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    sender = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    if not sid or not token:
        print("ERROR: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing", file=sys.stderr)
        return 2

    to = args.to if args.to.startswith("whatsapp:") else f"whatsapp:{args.to}"
    try:
        msg = Client(sid, token).messages.create(from_=sender, to=to, body=args.body)
    except TwilioRestException as e:
        print(f"Twilio error {e.code}: {e.msg}", file=sys.stderr)
        return 1
    print(f"OK sid={msg.sid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

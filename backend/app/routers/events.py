from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, extract
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_admin
from ..db import get_db
from ..models import CrewMember, EquipmentTag, Event, EventCrew, EventEquipment
from ..schemas import (
    CrewAssignRequest,
    EventCreate,
    EventListItem,
    EventOut,
    EventUpdate,
)
from ..services import whatsapp

router = APIRouter(prefix="/events", tags=["events"], dependencies=[Depends(get_current_admin)])


def _load_event(db: Session, event_id: int) -> Event:
    event = (
        db.query(Event)
        .options(
            selectinload(Event.crew_assignments).selectinload(EventCrew.crew_member),
            selectinload(Event.equipment_links).selectinload(EventEquipment.tag),
        )
        .filter(Event.id == event_id)
        .first()
    )
    if not event:
        raise HTTPException(404, "Event not found")
    return event


@router.get("", response_model=list[EventListItem])
def list_events(
    year: int | None = None,
    month: int | None = Query(None, ge=1, le=12),
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[Event]:
    q = db.query(Event)
    if year is not None:
        q = q.filter(extract("year", Event.start_at) == year)
    if month is not None:
        q = q.filter(extract("month", Event.start_at) == month)
    if status is not None:
        q = q.filter(Event.status == status)
    return q.order_by(Event.start_at.desc()).all()


@router.post("", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db)) -> Event:
    if payload.end_at <= payload.start_at:
        raise HTTPException(400, "end_at must be after start_at")
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    return _load_event(db, event.id)


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)) -> Event:
    return _load_event(db, event_id)


@router.patch("/{event_id}", response_model=EventOut)
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(event, field, value)
    if event.end_at <= event.start_at:
        raise HTTPException(400, "end_at must be after start_at")
    db.commit()
    return _load_event(db, event_id)


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db)) -> None:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    db.delete(event)
    db.commit()


# --- Crew assignment ---
@router.post("/{event_id}/crew", response_model=EventOut, status_code=201)
def assign_crew(event_id: int, payload: CrewAssignRequest, db: Session = Depends(get_db)) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    crew = db.get(CrewMember, payload.crew_member_id)
    if not crew:
        raise HTTPException(404, "Crew member not found")

    existing = db.query(EventCrew).filter(
        and_(EventCrew.event_id == event_id, EventCrew.crew_member_id == crew.id)
    ).first()
    if existing:
        raise HTTPException(409, "Crew already assigned to this event")

    link = EventCrew(event_id=event_id, crew_member_id=crew.id)
    db.add(link)
    db.commit()

    # Fire WhatsApp asynchronously-style (sync for simplicity, but failure-tolerant)
    try:
        result = whatsapp.send_assignment(crew, event)
        if result.ok:
            link.notified_at = datetime.now(timezone.utc)
            link.notification_sid = result.sid
            link.notification_error = None
        else:
            link.notification_error = result.error
        db.commit()
    except RuntimeError as e:
        link.notification_error = str(e)
        db.commit()

    return _load_event(db, event_id)


@router.delete("/{event_id}/crew/{crew_id}", status_code=204)
def unassign_crew(event_id: int, crew_id: int, db: Session = Depends(get_db)) -> None:
    link = db.query(EventCrew).filter(
        and_(EventCrew.event_id == event_id, EventCrew.crew_member_id == crew_id)
    ).first()
    if not link:
        raise HTTPException(404, "Assignment not found")
    db.delete(link)
    db.commit()


@router.post("/{event_id}/crew/{crew_id}/resend", response_model=EventOut)
def resend_assignment(event_id: int, crew_id: int, db: Session = Depends(get_db)) -> Event:
    link = db.query(EventCrew).filter(
        and_(EventCrew.event_id == event_id, EventCrew.crew_member_id == crew_id)
    ).first()
    if not link:
        raise HTTPException(404, "Assignment not found")
    event = db.get(Event, event_id)
    crew = db.get(CrewMember, crew_id)
    try:
        result = whatsapp.send_assignment(crew, event)
        if result.ok:
            link.notified_at = datetime.now(timezone.utc)
            link.notification_sid = result.sid
            link.notification_error = None
        else:
            link.notification_error = result.error
        db.commit()
    except RuntimeError as e:
        link.notification_error = str(e)
        db.commit()
    return _load_event(db, event_id)


# --- Equipment tagging ---
@router.post("/{event_id}/equipment/{tag_id}", response_model=EventOut, status_code=201)
def add_equipment(event_id: int, tag_id: int, db: Session = Depends(get_db)) -> Event:
    event = db.get(Event, event_id)
    tag = db.get(EquipmentTag, tag_id)
    if not event or not tag:
        raise HTTPException(404, "Event or tag not found")
    existing = db.query(EventEquipment).filter(
        and_(EventEquipment.event_id == event_id, EventEquipment.equipment_tag_id == tag_id)
    ).first()
    if not existing:
        db.add(EventEquipment(event_id=event_id, equipment_tag_id=tag_id))
        db.commit()
    return _load_event(db, event_id)


@router.delete("/{event_id}/equipment/{tag_id}", status_code=204)
def remove_equipment(event_id: int, tag_id: int, db: Session = Depends(get_db)) -> None:
    link = db.query(EventEquipment).filter(
        and_(EventEquipment.event_id == event_id, EventEquipment.equipment_tag_id == tag_id)
    ).first()
    if not link:
        raise HTTPException(404, "Tag not on this event")
    db.delete(link)
    db.commit()

from collections import Counter
from datetime import datetime
from calendar import monthrange

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_admin
from ..db import get_db
from ..models import Event, EventCrew, EventEquipment
from ..schemas import MonthSummary, TopItem, YearMonthBreakdown, YearSummary

router = APIRouter(prefix="/summary", tags=["summary"], dependencies=[Depends(get_current_admin)])


def _hours(event: Event) -> float:
    return (event.end_at - event.start_at).total_seconds() / 3600.0


def _aggregate(events: list[Event]) -> tuple[int, float, int]:
    total_hours = sum(_hours(e) for e in events)
    revenue = sum((e.price_cents or 0) for e in events)
    return len(events), total_hours, revenue


def _top_crew(events: list[Event], limit: int = 5) -> list[TopItem]:
    counter: Counter[tuple[int, str]] = Counter()
    for e in events:
        for a in e.crew_assignments:
            counter[(a.crew_member.id, a.crew_member.name)] += 1
    return [TopItem(id=k[0], name=k[1], count=v) for k, v in counter.most_common(limit)]


def _top_equipment(events: list[Event], limit: int = 10) -> list[TopItem]:
    counter: Counter[tuple[int, str]] = Counter()
    for e in events:
        for link in e.equipment_links:
            counter[(link.tag.id, link.tag.name)] += 1
    return [TopItem(id=k[0], name=k[1], count=v) for k, v in counter.most_common(limit)]


def _events_query(db: Session):
    return db.query(Event).options(
        selectinload(Event.crew_assignments).selectinload(EventCrew.crew_member),
        selectinload(Event.equipment_links).selectinload(EventEquipment.tag),
    )


@router.get("/month", response_model=MonthSummary)
def month_summary(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
) -> MonthSummary:
    events = (
        _events_query(db)
        .filter(extract("year", Event.start_at) == year)
        .filter(extract("month", Event.start_at) == month)
        .all()
    )
    count, hours, revenue = _aggregate(events)
    avg = hours / count if count else 0.0
    return MonthSummary(
        year=year,
        month=month,
        event_count=count,
        total_hours=round(hours, 2),
        revenue_cents=revenue,
        avg_event_hours=round(avg, 2),
        top_crew=_top_crew(events),
        top_equipment=_top_equipment(events),
    )


@router.get("/year", response_model=YearSummary)
def year_summary(year: int = Query(...), db: Session = Depends(get_db)) -> YearSummary:
    events = _events_query(db).filter(extract("year", Event.start_at) == year).all()
    by_month: list[YearMonthBreakdown] = []
    for m in range(1, 13):
        month_events = [e for e in events if e.start_at.month == m]
        c, h, r = _aggregate(month_events)
        by_month.append(YearMonthBreakdown(month=m, event_count=c, total_hours=round(h, 2), revenue_cents=r))
    count, hours, revenue = _aggregate(events)
    return YearSummary(
        year=year,
        event_count=count,
        total_hours=round(hours, 2),
        revenue_cents=revenue,
        by_month=by_month,
        top_crew=_top_crew(events),
        top_equipment=_top_equipment(events),
    )

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


EventStatus = Literal["upcoming", "completed", "cancelled"]
ConfirmationStatus = Literal["pending", "confirmed", "declined"]


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Auth ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# --- Crew ---
class CrewBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr | None = None
    role: str | None = None
    notes: str | None = None
    active: bool = True


class CrewCreate(CrewBase):
    pass


class CrewUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    notes: str | None = None
    active: bool | None = None


class CrewOut(ORMBase):
    id: int
    name: str
    email: str | None
    role: str | None
    notes: str | None
    active: bool
    created_at: datetime


# --- Equipment ---
class EquipmentBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: str | None = None


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: str | None = None
    category: str | None = None


class EquipmentOut(ORMBase):
    id: int
    name: str
    category: str | None
    created_at: datetime


# --- Event assignments (nested in EventOut) ---
class CrewAssignmentOut(BaseModel):
    crew_member: CrewOut
    assigned_at: datetime
    invited_at: datetime | None
    cal_invite_status: str | None
    calendar_error: str | None
    confirmation_status: ConfirmationStatus

    model_config = ConfigDict(from_attributes=True)


class EquipmentLinkOut(BaseModel):
    tag: EquipmentOut

    model_config = ConfigDict(from_attributes=True)


# --- Events ---
class EventBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    client_name: str | None = None
    location: str | None = None
    start_at: datetime
    end_at: datetime
    description: str | None = None
    status: EventStatus = "upcoming"
    price_cents: int | None = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: str | None = None
    client_name: str | None = None
    location: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    description: str | None = None
    status: EventStatus | None = None
    price_cents: int | None = None


class EventListItem(ORMBase):
    id: int
    title: str
    client_name: str | None
    location: str | None
    start_at: datetime
    end_at: datetime
    status: EventStatus
    google_calendar_event_id: str | None


class EventOut(ORMBase):
    id: int
    title: str
    client_name: str | None
    location: str | None
    start_at: datetime
    end_at: datetime
    description: str | None
    status: EventStatus
    price_cents: int | None
    google_calendar_event_id: str | None
    created_at: datetime
    updated_at: datetime
    crew_assignments: list[CrewAssignmentOut] = []
    equipment_links: list[EquipmentLinkOut] = []


class CrewAssignRequest(BaseModel):
    crew_member_id: int


# --- Google OAuth status ---
class GoogleCalendarStatus(BaseModel):
    connected: bool
    owner_email: str | None = None
    calendar_id: str | None = None


# --- Summary ---
class TopItem(BaseModel):
    id: int
    name: str
    count: int


class MonthSummary(BaseModel):
    year: int
    month: int
    event_count: int
    total_hours: float
    revenue_cents: int
    avg_event_hours: float
    top_crew: list[TopItem]
    top_equipment: list[TopItem]


class YearMonthBreakdown(BaseModel):
    month: int
    event_count: int
    total_hours: float
    revenue_cents: int


class YearSummary(BaseModel):
    year: int
    event_count: int
    total_hours: float
    revenue_cents: int
    by_month: list[YearMonthBreakdown]
    top_crew: list[TopItem]
    top_equipment: list[TopItem]

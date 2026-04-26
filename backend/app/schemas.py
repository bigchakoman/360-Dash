from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
import phonenumbers


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


# --- Crew ---
class CrewBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str
    role: str | None = None
    notes: str | None = None
    active: bool = True

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        try:
            parsed = phonenumbers.parse(v, None)
        except phonenumbers.NumberParseException as e:
            raise ValueError(f"Invalid phone number: {e}") from e
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("Invalid phone number")
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


class CrewCreate(CrewBase):
    pass


class CrewUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    role: str | None = None
    notes: str | None = None
    active: bool | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return CrewBase.validate_phone(v)


class CrewOut(ORMBase):
    id: int
    name: str
    phone: str
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
    notified_at: datetime | None
    notification_sid: str | None
    notification_error: str | None
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
    created_at: datetime
    updated_at: datetime
    crew_assignments: list[CrewAssignmentOut] = []
    equipment_links: list[EquipmentLinkOut] = []


class CrewAssignRequest(BaseModel):
    crew_member_id: int


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

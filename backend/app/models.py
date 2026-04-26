from datetime import datetime
from sqlalchemy import (
    String,
    Integer,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


class AdminUser(Base):
    __tablename__ = "admin_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class CrewMember(Base):
    __tablename__ = "crew_member"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    role: Mapped[str | None] = mapped_column(String(80))
    notes: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    assignments: Mapped[list["EventCrew"]] = relationship(back_populates="crew_member", cascade="all, delete-orphan")


class EquipmentTag(Base):
    __tablename__ = "equipment_tag"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    category: Mapped[str | None] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    event_links: Mapped[list["EventEquipment"]] = relationship(back_populates="tag", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(160))
    location: Mapped[str | None] = mapped_column(String(255))
    start_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="upcoming", nullable=False)
    price_cents: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    crew_assignments: Mapped[list["EventCrew"]] = relationship(
        back_populates="event", cascade="all, delete-orphan", lazy="selectin"
    )
    equipment_links: Mapped[list["EventEquipment"]] = relationship(
        back_populates="event", cascade="all, delete-orphan", lazy="selectin"
    )


class EventCrew(Base):
    __tablename__ = "event_crew"
    __table_args__ = (UniqueConstraint("event_id", "crew_member_id", name="uq_event_crew"),)

    event_id: Mapped[int] = mapped_column(ForeignKey("event.id", ondelete="CASCADE"), primary_key=True)
    crew_member_id: Mapped[int] = mapped_column(ForeignKey("crew_member.id", ondelete="CASCADE"), primary_key=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    notified_at: Mapped[datetime | None] = mapped_column(DateTime)
    notification_sid: Mapped[str | None] = mapped_column(String(64))
    notification_error: Mapped[str | None] = mapped_column(Text)
    confirmation_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    event: Mapped[Event] = relationship(back_populates="crew_assignments")
    crew_member: Mapped[CrewMember] = relationship(back_populates="assignments", lazy="joined")


class EventEquipment(Base):
    __tablename__ = "event_equipment"

    event_id: Mapped[int] = mapped_column(ForeignKey("event.id", ondelete="CASCADE"), primary_key=True)
    equipment_tag_id: Mapped[int] = mapped_column(ForeignKey("equipment_tag.id", ondelete="CASCADE"), primary_key=True)

    event: Mapped[Event] = relationship(back_populates="equipment_links")
    tag: Mapped[EquipmentTag] = relationship(back_populates="event_links", lazy="joined")

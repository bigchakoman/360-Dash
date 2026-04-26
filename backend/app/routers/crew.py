from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..db import get_db
from ..models import CrewMember
from ..schemas import CrewCreate, CrewOut, CrewUpdate

router = APIRouter(prefix="/crew", tags=["crew"], dependencies=[Depends(get_current_admin)])


@router.get("", response_model=list[CrewOut])
def list_crew(active_only: bool = False, db: Session = Depends(get_db)) -> list[CrewMember]:
    q = db.query(CrewMember)
    if active_only:
        q = q.filter(CrewMember.active.is_(True))
    return q.order_by(CrewMember.name).all()


@router.post("", response_model=CrewOut, status_code=201)
def create_crew(payload: CrewCreate, db: Session = Depends(get_db)) -> CrewMember:
    member = CrewMember(**payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/{crew_id}", response_model=CrewOut)
def get_crew(crew_id: int, db: Session = Depends(get_db)) -> CrewMember:
    member = db.get(CrewMember, crew_id)
    if not member:
        raise HTTPException(404, "Crew member not found")
    return member


@router.patch("/{crew_id}", response_model=CrewOut)
def update_crew(crew_id: int, payload: CrewUpdate, db: Session = Depends(get_db)) -> CrewMember:
    member = db.get(CrewMember, crew_id)
    if not member:
        raise HTTPException(404, "Crew member not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{crew_id}", status_code=204)
def delete_crew(crew_id: int, db: Session = Depends(get_db)) -> None:
    member = db.get(CrewMember, crew_id)
    if not member:
        raise HTTPException(404, "Crew member not found")
    db.delete(member)
    db.commit()

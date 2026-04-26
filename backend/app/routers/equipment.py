from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..db import get_db
from ..models import EquipmentTag
from ..schemas import EquipmentCreate, EquipmentOut, EquipmentUpdate

router = APIRouter(prefix="/equipment", tags=["equipment"], dependencies=[Depends(get_current_admin)])


@router.get("", response_model=list[EquipmentOut])
def list_equipment(db: Session = Depends(get_db)) -> list[EquipmentTag]:
    return db.query(EquipmentTag).order_by(EquipmentTag.category, EquipmentTag.name).all()


@router.post("", response_model=EquipmentOut, status_code=201)
def create_equipment(payload: EquipmentCreate, db: Session = Depends(get_db)) -> EquipmentTag:
    tag = EquipmentTag(**payload.model_dump())
    db.add(tag)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Tag with that name already exists") from None
    db.refresh(tag)
    return tag


@router.patch("/{tag_id}", response_model=EquipmentOut)
def update_equipment(tag_id: int, payload: EquipmentUpdate, db: Session = Depends(get_db)) -> EquipmentTag:
    tag = db.get(EquipmentTag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Tag with that name already exists") from None
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_equipment(tag_id: int, db: Session = Depends(get_db)) -> None:
    tag = db.get(EquipmentTag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag not found")
    db.delete(tag)
    db.commit()

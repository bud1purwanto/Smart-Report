from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.variant import ReportVariant
from app.schemas.variant import VariantCreate, VariantUpdate, VariantResponse

router = APIRouter(prefix="/variants", tags=["Variants"])

@router.post("", response_model=VariantResponse)
def create_variant(data: VariantCreate, db: Session = Depends(get_db)):
    if data.is_default:
        # Clear default flag on existing variants for this query
        db.query(ReportVariant).filter(ReportVariant.query_id == data.query_id).update({"is_default": False})
    
    variant = ReportVariant(
        query_id=data.query_id,
        name=data.name,
        column_order=data.column_order,
        hidden_columns=data.hidden_columns,
        filter_parameters=data.filter_parameters,
        sort_parameters=data.sort_parameters,
        custom_columns=[c.model_dump() for c in data.custom_columns],
        is_default=data.is_default
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant

@router.get("/query/{query_id}", response_model=List[VariantResponse])
def list_variants_for_query(query_id: int, db: Session = Depends(get_db)):
    return db.query(ReportVariant).filter(ReportVariant.query_id == query_id).order_by(ReportVariant.name.asc()).all()

@router.get("/{variant_id}", response_model=VariantResponse)
def get_variant(variant_id: int, db: Session = Depends(get_db)):
    variant = db.query(ReportVariant).filter(ReportVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    return variant

@router.put("/{variant_id}", response_model=VariantResponse)
def update_variant(variant_id: int, data: VariantUpdate, db: Session = Depends(get_db)):
    variant = db.query(ReportVariant).filter(ReportVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    if data.is_default is True:
        db.query(ReportVariant).filter(ReportVariant.query_id == variant.query_id).update({"is_default": False})
        variant.is_default = True

    if data.name is not None:
        variant.name = data.name
    if data.column_order is not None:
        variant.column_order = data.column_order
    if data.hidden_columns is not None:
        variant.hidden_columns = data.hidden_columns
    if data.filter_parameters is not None:
        variant.filter_parameters = data.filter_parameters
    if data.sort_parameters is not None:
        variant.sort_parameters = data.sort_parameters
    if data.custom_columns is not None:
        variant.custom_columns = [c.model_dump() for c in data.custom_columns]

    db.commit()
    db.refresh(variant)
    return variant

@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(variant_id: int, db: Session = Depends(get_db)):
    variant = db.query(ReportVariant).filter(ReportVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    db.delete(variant)
    db.commit()
    return None


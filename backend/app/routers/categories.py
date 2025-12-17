"""
Categories router - provides endpoint to list available transaction categories.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=list[schemas.CategoryOut])
def list_categories(
    type: Optional[str] = Query(None, description="Filter by 'expense' or 'income'"),
    db: Session = Depends(get_db)
):
    """Get all categories, optionally filtered by type (expense/income)."""
    return crud.get_categories(db, type_filter=type)
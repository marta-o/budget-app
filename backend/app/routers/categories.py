from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import get_db
from typing import Optional

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=list[schemas.CategoryOut])
def list_categories(type: Optional[str] = None, db: Session = Depends(get_db)):
    """
    If `type` query param is provided ('expense'|'income') only those categories are returned.
    Otherwise all categories are returned.
    """
    return crud.get_categories(db, type_filter=type)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=list[schemas.CategoryOut])
def list_categories(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.get_categories(db, user.person_id)
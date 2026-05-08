from fastapi import APIRouter,HTTPException,status,Depends
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Category
from app.schemas.category import CategoryCreate,CategoryResponse
from app.utils.auth_helper import get_admin_user
from app.utils.validators import validate_category_exists,validate_category_unique


router = APIRouter(prefix="/categories",tags=["Categorie"])

@router.get("/",response_model=List[CategoryResponse])
def get_categories(db : Session=Depends(get_db)):
    categories = db.query(Category).all()
    return categories

@router.post("/",response_model=CategoryResponse)
def add_category(category_data:CategoryCreate,db:Session=Depends(get_db),admin = Depends(get_admin_user)):
    name = category_data.name 
    validate_category_unique(name,db)
    category = Category(
        name = name,
        description = category_data.description
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return category

@router.delete("/{id}")
def delete_category(
    id : int,
    db : Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    category = validate_category_exists(id,db) 
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}
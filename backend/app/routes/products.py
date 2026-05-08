from fastapi import APIRouter,HTTPException,status,Depends
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from app.schemas.product import ProductCreate,ProductUpdate,ProductResponse
from app.utils.auth_helper import get_admin_user 
from app.utils.validators import validate_product_exists
from app.utils.validators import validate_category_exists

router = APIRouter(prefix="/products",tags=["Product"])


@router.get("/{id}")
def get_product(id: int, db: Session = Depends(get_db)):
    product = validate_product_exists(id, db)
    return product

@router.get("/",response_model=List[ProductResponse])
def get_all_product(category: int = None, db: Session = Depends(get_db)):
    if category:
        products = db.query(Product).filter(Product.category_id == category).all()
    else:
        products = db.query(Product).all()
    return products

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ProductResponse)
def add_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    validate_category_exists(product_data.category_id, db)
    
    product = Product(
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        stock=product_data.stock,
        category_id=product_data.category_id
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product

@router.put("/{id}",response_model=ProductResponse)
def update_product(
    id : int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    product = validate_product_exists(id,db)
    if product_data.name is not None:
        product.name = product_data.name
    if product_data.description is not None:
        product.description = product_data.description
    if product_data.price is not None:
        product.price = product_data.price
    if product_data.stock is not None:
        product.stock = product_data.stock
    if product_data.category_id is not None:
        validate_category_exists(product_data.category_id, db)
        product.category_id = product_data.category_id

    db.commit()
    db.refresh(product)

    return product

@router.delete("/{id}")
def delete_product(
    id : int,
    db : Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    product = validate_product_exists(id,db)
    db.delete(product)
    db.commit()

    return {"message": "Product deleted successfully"}


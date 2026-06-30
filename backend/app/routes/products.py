from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status, Depends, Query
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from app.schemas.product import ProductCreate,ProductUpdate,ProductResponse
from app.utils.auth_helper import get_admin_user 
from app.utils.validators import validate_product_exists
from app.utils.validators import validate_category_exists

router = APIRouter(prefix="/api/products",tags=["Product"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "products"
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024


def _build_product_image_name(filename: str) -> str:
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, and WEBP images are allowed"
        )

    return f"{uuid4().hex}{extension}"


@router.get("/{id}")
def get_product(id: int, db: Session = Depends(get_db)):
    product = validate_product_exists(id, db)
    return product

@router.get("/",response_model=List[ProductResponse])
def get_all_product(
    category: int = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    if category:
        products = (
            db.query(Product)
            .filter(Product.category_id == category)
            .offset(skip)
            .limit(limit)
            .all()
        )
    else:
        products = db.query(Product).offset(skip).limit(limit).all()
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
        category_id=product_data.category_id,
        image_url=product_data.image_url
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product

@router.post("/upload-image")
async def upload_product_image(
    image: UploadFile = File(...),
    admin = Depends(get_admin_user)
):
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, and WEBP images are allowed"
        )

    filename = _build_product_image_name(image.filename or "")
    contents = await image.read()

    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be 2MB or smaller"
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(contents)

    return {"image_url": f"/uploads/products/{filename}"}

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
    if "image_url" in product_data.model_fields_set:
        product.image_url = product_data.image_url

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


from fastapi import HTTPException,status,Depends,UploadFile
from sqlalchemy.orm import Session
from app.models import Category,Product,CartItem,Order
from app.database import get_db

def validate_category_exists(
        category_id : int,
        db : Session 
) :
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category :
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Category not found")
    return category

def validate_category_unique(
        name : str ,
        db : Session
):
    category = db.query(Category).filter(Category.name == name).first() 
    if  category :
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail="Category was exist")
    
def validate_product_exists (
        product_id : int,
        db : Session 
) :
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product :
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Product not found")
    return product

def validate_stock_available(
        product_id : int,
        quantity : int ,
        db : Session 
):
    product = validate_product_exists(product_id,db)
    if product.stock < quantity :
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Out of stock")
    return product

def validate_cart_not_empty(
        user_id : int ,
        db : Session
):
    cart = db.query(CartItem).filter(CartItem.user_id == user_id).first()
    if not cart :
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Cart is empty")
    return cart

def validate_order_owner(
        order_id : int,
        user_id : int,
        db : Session
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Invalid order")
    if order.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Not your order")
    return order

async def validate_image(
        image : UploadFile
):
    allowed = ["image/jpeg","image/png","image/webp"]
    if image.content_type not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Only jpeg,png,webp allowed")
    content = await image.read()
    if len(content) > 2 * 1024 * 1024 :
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be less than 2MB"
        )
    await image.seek(0)
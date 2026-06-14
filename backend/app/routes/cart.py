from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartAddItem, CartUpdateItem, CartItemResponse, CartResponse
from app.utils.auth_helper import get_current_user

router = APIRouter(prefix="/api/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    
    total = sum(item.product.price * item.quantity for item in cart_items)
    
    return CartResponse(
        items=[CartItemResponse.model_validate(item) for item in cart_items],
        total=total
    )


@router.post("/add", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    item_data: CartAddItem,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == item_data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.stock < item_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity not available"
        )
    
    existing_item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == item_data.product_id
    ).first()
    
    if existing_item:
        new_quantity = existing_item.quantity + item_data.quantity
        if product.stock < new_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity not available"
            )

        existing_item.quantity = new_quantity
        db.commit()
        db.refresh(existing_item)
        return CartItemResponse.model_validate(existing_item)
    
    cart_item = CartItem(
        user_id=current_user.id,
        product_id=item_data.product_id,
        quantity=item_data.quantity
    )
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    
    return CartItemResponse.model_validate(cart_item)


@router.put("/update/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: int,
    update_data: CartUpdateItem,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    if cart_item.product.stock < update_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity not available"
        )
    
    cart_item.quantity = update_data.quantity
    db.commit()
    db.refresh(cart_item)
    
    return CartItemResponse.model_validate(cart_item)


@router.delete("/remove/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_cart(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    db.delete(cart_item)
    db.commit()

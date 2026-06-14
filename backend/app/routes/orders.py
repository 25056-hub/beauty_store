from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.cart import CartItem
from app.models.user import User
from app.schemas.order import OrderCreate, OrderUpdateStatus, OrderResponse
from app.utils.auth_helper import get_current_user, get_admin_user

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=list[OrderResponse])
def get_orders(
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    orders = (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
def get_order_details(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return order


@router.post("/create", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty"
        )
    
    for cart_item in cart_items:
        if cart_item.product.stock < cart_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantity not available for {cart_item.product.name}"
            )

    try:
        total_price = sum(item.product.price * item.quantity for item in cart_items)

        order = Order(
            user_id=current_user.id,
            total_price=total_price,
            shipping_address=order_data.shipping_address,
            status="pending"
        )

        db.add(order)
        db.flush()

        for cart_item in cart_items:
            cart_item.product.stock -= cart_item.quantity
            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                quantity=cart_item.quantity,
                unit_price=float(cart_item.product.price)
            )
            db.add(order_item)

        db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()

        db.commit()
        db.refresh(order)

        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create order"
        )


@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    update_data: OrderUpdateStatus,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    order.status = update_data.status
    db.commit()
    db.refresh(order)
    
    return order

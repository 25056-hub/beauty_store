from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cart import CartItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.schemas.checkout import CheckoutCreate, CheckoutResponse
from app.utils.auth_helper import get_current_user

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


@router.post("", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
def create_checkout(
    checkout_data: CheckoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cart_items = (
            db.query(CartItem)
            .filter(CartItem.user_id == current_user.id)
            .all()
        )

        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty",
            )

        duplicate_code = (
            db.query(Payment)
            .filter(Payment.bpay_code == checkout_data.bpay_code)
            .first()
        )

        if duplicate_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="B-pay code already used",
            )

        for cart_item in cart_items:
            if cart_item.product.stock < cart_item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Quantity not available for {cart_item.product.name}",
                )

        total_price = sum(item.product.price * item.quantity for item in cart_items)

        order = Order(
            user_id=current_user.id,
            total_price=total_price,
            shipping_address=checkout_data.shipping_address,
            status=OrderStatus.pending,
        )
        db.add(order)
        db.flush()

        for cart_item in cart_items:
            cart_item.product.stock -= cart_item.quantity
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=cart_item.product_id,
                    quantity=cart_item.quantity,
                    unit_price=float(cart_item.product.price),
                )
            )

        payment = Payment(
            order_id=order.id,
            amount=float(total_price),
            method="bankily_bpay",
            status=PaymentStatus.under_review,
            bpay_code=checkout_data.bpay_code,
        )
        db.add(payment)

        (
            db.query(CartItem)
            .filter(CartItem.user_id == current_user.id)
            .delete(synchronize_session=False)
        )

        db.commit()
        db.refresh(order)
        db.refresh(payment)

        return {"order": order, "payment": payment}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not complete checkout",
        )

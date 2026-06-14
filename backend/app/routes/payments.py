from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentReview
from app.utils.auth_helper import get_admin_user, get_current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/submit", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def submit_bpay_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(
        Order.id == payment_data.order_id,
        Order.user_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.status == OrderStatus.paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order already paid"
        )

    existing_payment = db.query(Payment).filter(
        Payment.order_id == payment_data.order_id
    ).first()

    if existing_payment:
        if existing_payment.status == PaymentStatus.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already completed"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already submitted for review"
        )

    duplicate_code = db.query(Payment).filter(
        Payment.bpay_code == payment_data.bpay_code
    ).first()

    if duplicate_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="B-pay code already used"
        )

    payment = Payment(
        order_id=payment_data.order_id,
        amount=float(order.total_price),
        method="bankily_bpay",
        status=PaymentStatus.under_review,
        bpay_code=payment_data.bpay_code
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


@router.get("/admin/pending", response_model=list[PaymentResponse])
def get_pending_payments(
    admin_user: User = Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    payments = (
        db.query(Payment)
        .filter(Payment.status == PaymentStatus.under_review)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return payments


@router.put("/admin/{payment_id}/review", response_model=PaymentResponse)
def review_payment(
    payment_id: int,
    review_data: PaymentReview,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    if payment.status == PaymentStatus.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already approved"
        )

    payment.status = PaymentStatus(review_data.status)
    payment.admin_note = review_data.admin_note
    payment.reviewed_at = datetime.now(timezone.utc)

    if payment.status == PaymentStatus.success:
        payment.order.status = OrderStatus.paid

    db.commit()
    db.refresh(payment)

    return payment


@router.get("/{order_id}", response_model=PaymentResponse)
def get_payment_status(
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
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    return payment

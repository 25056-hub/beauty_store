from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User
from schemas.payment import PaymentCreate, PaymentResponse, StripeResponse
from app.utils.auth_helper import get_current_user
from config import settings
import stripe
import hmac
import hashlib
import json

stripe.api_key = settings.STRIPE_API_KEY

router = APIRouter(prefix="/api/payments", tags=["payments"])


class StripeWebhookEvent(BaseModel):
    order_id: int = Field(gt=0)
    status: str
    transaction_id: str


@router.post("/checkout", response_model=StripeResponse, status_code=status.HTTP_201_CREATED)
def create_payment_checkout(
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
    existing_payment = db.query(Payment).filter(
        Payment.order_id == payment_data.order_id
    ).first()
    if existing_payment:
        if existing_payment.status == "success":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already completed"
            )
    else:
        payment = Payment(
            order_id=payment_data.order_id,
            amount=float(order.total_price),
            method="stripe",
            status="pending"
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"Order #{order.id}",
                        },
                        "unit_amount": int(float(order.total_price) * 100),
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url="https://yourdomain.com/orders?status=success",
            cancel_url="https://yourdomain.com/checkout?canceled=true",
            client_reference_id=str(payment_data.order_id),
            metadata={
                "order_id": payment_data.order_id,
                "user_id": current_user.id
            }
        )
        payment = db.query(Payment).filter(Payment.order_id == payment_data.order_id).first()
        if payment:
            payment.transaction_id = checkout_session.id
            db.commit()
        return StripeResponse(checkout_url=checkout_session.url)
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header"
        )
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid signature - هذا الطلب لم يأت من Stripe"
        )
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        order_id = int(session.get("client_reference_id"))
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        payment.status = "success"
        payment.transaction_id = session.id
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            order.status = "paid"
        db.commit()
        return {"received": True, "status": "payment_completed"}
    elif event["type"] == "checkout.session.expired":
        session = event["data"]["object"]
        order_id = int(session.get("client_reference_id"))
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        if payment:
            payment.status = "failed"
            db.commit()
        return {"received": True, "status": "payment_expired"}
    return {"received": True}


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

from pydantic import BaseModel, Field

from app.schemas.order import OrderResponse
from app.schemas.payment import PaymentResponse


class CheckoutCreate(BaseModel):
    shipping_address: str = Field(min_length=1, max_length=200)
    bpay_code: str = Field(min_length=4, max_length=4, pattern=r"^\d{4}$")


class CheckoutResponse(BaseModel):
    order: OrderResponse
    payment: PaymentResponse

from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Literal, Optional

from app.models.payment import PaymentStatus


class PaymentCreate(BaseModel):
    order_id: int = Field(gt=0)
    bpay_code: str = Field(min_length=4, max_length=4, pattern=r"^\d{4}$")


class PaymentReview(BaseModel):
    status: Literal["success", "rejected"]
    admin_note: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    amount: float
    status: PaymentStatus
    method: str
    bpay_code: str
    admin_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

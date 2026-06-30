from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductResponse
from app.schemas.user import UserResponse


class OrderCreate(BaseModel):
    shipping_address: str = Field(min_length=1, max_length=200)


class OrderUpdateStatus(BaseModel):
    status: Literal["pending", "paid", "shipped", "delivered", "cancelled"]


class OrderItemResponse(BaseModel):
    id: int
    product: ProductResponse
    quantity: int = Field(ge=1)
    unit_price: float

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class OrderResponse(BaseModel):
    id: int
    items: List[OrderItemResponse]
    total_price: float
    status: Optional[str] = "pending"
    created_at: datetime
    shipping_address: str = Field(min_length=1, max_length=200)

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class AdminOrderResponse(OrderResponse):
    user: UserResponse

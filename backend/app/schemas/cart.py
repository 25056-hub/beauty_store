from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from schemas.product import ProductResponse

class CartAddItem(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1)

class CartUpdateItem(BaseModel):
    quantity: int = Field(ge=1)

class CartItemResponse(BaseModel):
    id: int
    product: ProductResponse
    quantity: int = Field(ge=1)

    model_config = ConfigDict(from_attributes=True)

class CartResponse(BaseModel):
    items: List[CartItemResponse]
    total: float = Field(ge=0)

    model_config = ConfigDict(from_attributes=True)
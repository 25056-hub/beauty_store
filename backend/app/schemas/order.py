from pydantic import BaseModel,ConfigDict,EmailStr,Field
from datetime import datetime
from typing import Optional,List
from schemas.product import ProductResponse

class OrderCreate(BaseModel):
    shipping_address : str = Field(min_length=1,max_length=200)

class OrderUpdateStatus(BaseModel):
    status : str = 'pending' 

class OrderItemResponse(BaseModel):
    id: int
    product: ProductResponse
    quantity: int = Field(ge=1)
    unit_price : float 

    model_config = ConfigDict(from_attributes=True)

class OrderResponse(BaseModel):
    id : int 
    items = List[OrderItemResponse]
    total_price : float 
    status : Optional[str] = 'pending' 
    created_at : datetime
    shipping_address : str = Field(min_length=1,max_length=200)

    model_config = ConfigDict(from_attributes=True)

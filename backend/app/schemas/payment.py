from pydantic import BaseModel,ConfigDict,EmailStr,Field
from datetime import datetime
from typing import Optional

class PaymentCreate(BaseModel):
    order_id : int = Field(gt=0)

class PaymentResponse(BaseModel):
    id : int 
    amount : float
    status : str
    method : str
    created_at : datetime 

    model_config = ConfigDict(from_attributes=True)

class StripeResponse(BaseModel):
    checkout_url : str

    model_config = ConfigDict(from_attributes=True)
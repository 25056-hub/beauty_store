from pydantic import BaseModel,ConfigDict,Field
from datetime import datetime
from typing import Optional

class ProductCreate(BaseModel):
    name : str = Field(min_length=1,max_length=200)
    description : Optional[str] = None
    price : float = Field(gt=0)
    stock : int  = Field(ge=0)
    category_id : int
    image_url : Optional[str] = Field(default=None,max_length=200)

class ProductUpdate(BaseModel):
    name : Optional[str ]  = Field(min_length=1,max_length=200)
    description : Optional[str] = None
    price : Optional[float] = Field(gt=0,default=None)
    stock : Optional[int ] = Field(ge=0,default=None)
    category_id : Optional[int] = None
    image_url : Optional[str] = Field(default=None,max_length=200)

class ProductResponse(BaseModel):
    id : int 
    name : str = Field(min_length=1,max_length=200)
    description : Optional[str] = None
    price : float =Field(gt=0)
    stock : int = Field(ge=0)
    category_id : int
    created_at : datetime
    image_url : Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

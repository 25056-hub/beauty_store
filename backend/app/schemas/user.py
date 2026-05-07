from pydantic import BaseModel,ConfigDict,EmailStr,Field
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    email: EmailStr = Field(max_length=120)

class UserRegister(UserBase):
    password : str = Field(min_length=8,max_length=30)
    phone : Optional[str] = Field(default=None,min_length=8,max_length=8)
    address : Optional[str] = None

class UserLogin(BaseModel):
    email : EmailStr = Field(max_length=120)
    password : str = Field(min_length=8,max_length=30)

class UserResponse(UserBase):
    id : int = Field(ge=0)
    role : str 
    created_at : datetime
    address : Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserAdminResponse(UserResponse):
    password : str = Field(min_length=8,max_length=30)
    phone : Optional[str] = Field(default=None,min_length=8,max_length=8)
    address : Optional[str] = None

class TokenResponse(BaseModel):
    access_token : str 
    token_type : str = "bearer"

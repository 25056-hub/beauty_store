from pydantic import BaseModel,ConfigDict,EmailStr,Field
from datetime import datetime
from typing import Literal, Optional

class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    email: EmailStr = Field(max_length=120)

class UserRegister(UserBase):
    password : str = Field(min_length=8,max_length=30)
    phone : Optional[str] = Field(default=None,min_length=8,max_length=8)
    address : Optional[str] = None

class UserUpdate(BaseModel):
    name : Optional[str] = Field(default=None,min_length=1,max_length=50)
    phone : Optional[str] = Field(default=None,min_length=8,max_length=8)
    address : Optional[str] = Field(default=None,max_length=50)

class UserPasswordUpdate(BaseModel):
    current_password : str = Field(min_length=8,max_length=30)
    new_password : str = Field(min_length=8,max_length=30)

class UserRoleUpdate(BaseModel):
    role : Literal["customer", "admin"]

class UserLogin(BaseModel):
    email : EmailStr = Field(max_length=120)
    password : str = Field(min_length=8,max_length=30)

class UserResponse(BaseModel):
    id : int = Field(ge=0)
    name: str = Field(min_length=1, max_length=50)
    email: str = Field(max_length=250)
    role : str 
    created_at : datetime
    phone : Optional[str] = None
    address : Optional[str] = None

    model_config = ConfigDict(from_attributes=True,use_enum_values=True)

class AdminUserResponse(UserResponse):
    orders_count : int = Field(ge=0)

class UserAdminResponse(UserResponse):
    password : str = Field(min_length=8,max_length=30)
    phone : Optional[str] = Field(default=None,min_length=8,max_length=8)
    address : Optional[str] = None

class TokenResponse(BaseModel):
    access_token : str 
    token_type : str = "bearer"

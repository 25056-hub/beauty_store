from sqlalchemy.orm import Mapped,mapped_column,relationship
from sqlalchemy import String,Enum,DateTime
from sqlalchemy.sql import func
from typing import List, Optional
from app.database import Base
from datetime import datetime
import enum 

class UserRole(enum.Enum):
    customer : str = "customer"
    admin : str = "admin"

class User(Base):
    __tablename__ = "users"
    id : Mapped[int] = mapped_column(primary_key=True,index=True)
    name : Mapped[str] = mapped_column(String(50),nullable=False)
    email : Mapped[str] = mapped_column(String(250),nullable=False,unique=True)
    password_hash : Mapped[str] = mapped_column(String(255),nullable=False)
    role : Mapped[UserRole] = mapped_column(Enum(UserRole),default=UserRole.customer)
    phone : Mapped[Optional[str]] = mapped_column(String(20))                                 
    address  : Mapped[Optional[str]] = mapped_column(String(50))                               
    created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())

    orders : Mapped[List['Order']] = relationship('Order',back_populates='user',cascade='all,delete-orphan')
    cart_items : Mapped[List['CartItem']] = relationship('CartItem',back_populates='user',cascade='all,delete-orphan')

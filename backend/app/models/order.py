from sqlalchemy import String,ForeignKey,Numeric,DateTime,Enum as SAEnum
from sqlalchemy.orm import Mapped,mapped_column,relationship
from app.database import Base
from datetime import datetime
from sqlalchemy.sql import func
from typing import List
import enum

class OrderStatus(enum.Enum):
    pending = "pending"
    paid = "paid"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
class Order(Base):
    __tablename__ = "orders"
    id : Mapped[int] = mapped_column(primary_key=True,index=True)
    total_price : Mapped[float] = mapped_column(Numeric(10,2))
    status : Mapped[OrderStatus] = mapped_column(SAEnum(OrderStatus),default=OrderStatus.pending)
    shipping_address : Mapped[str] = mapped_column(String(100))
    created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())
    user_id : Mapped[int] = mapped_column(ForeignKey("users.id"))

    #Relationships
    user : Mapped["User"] = relationship(back_populates="orders")
    items : Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payment : Mapped["Payment"] = relationship(back_populates="order",uselist=False)

class OrderItem(Base) :    
    __tablename__ = "order_items"
    id : Mapped[int] = mapped_column(primary_key=True,index=True)
    quantity : Mapped[int] = mapped_column()
    unit_price : Mapped[float] = mapped_column(Numeric(10,2))
    order_id : Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id : Mapped[int] = mapped_column(ForeignKey("products.id"))

    #Relationships
    order : Mapped["Order"] = relationship(back_populates = "items")
    product : Mapped["Product"] = relationship(back_populates = "order_items")
    







    
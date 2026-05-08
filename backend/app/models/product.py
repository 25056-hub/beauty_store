from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey,Numeric
from sqlalchemy.sql import func
from datetime import datetime
from typing import List
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id          : Mapped[int]          = mapped_column(primary_key=True, index=True)
    name        : Mapped[str]          = mapped_column(String(200), nullable=False)
    description : Mapped[str | None]   = mapped_column(String(500))
    price       : Mapped[float]        = mapped_column(Numeric(10,2))
    stock       : Mapped[int]          = mapped_column(nullable=False)
    image_url   : Mapped[str | None]   = mapped_column(String(200))
    category_id : Mapped[int]          = mapped_column(ForeignKey("categories.id"))
    created_at  : Mapped[datetime]     = mapped_column(DateTime(timezone=True), server_default=func.now())

    category    : Mapped["Category"]        = relationship("Category",  back_populates="products")
    cart_items  : Mapped[List["CartItem"]]  = relationship("CartItem",  back_populates="product")
    order_items : Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="product")

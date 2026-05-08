from sqlalchemy.orm import Mapped,mapped_column,relationship
from sqlalchemy import String,ForeignKey,UniqueConstraint
from app.database import Base

class CartItem(Base):
    __tablename__ = "cart_items"
    id : Mapped[int] = mapped_column(primary_key=True,index=True)
    quantity : Mapped[int] = mapped_column()
    user_id : Mapped[int] = mapped_column(ForeignKey("users.id"))
    product_id : Mapped[int] = mapped_column(ForeignKey("products.id"))
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)

    user : Mapped["User"] = relationship(back_populates="cart_items")
    product : Mapped["Product"] = relationship(back_populates="cart_items")
    

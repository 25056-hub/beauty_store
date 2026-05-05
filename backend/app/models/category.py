from sqlalchemy.orm import Mapped,mapped_column,relationship
from sqlalchemy import String
from typing import List
from app.database import Base
class Category(Base):
    __tablename__ = "categories"

    id : Mapped[int] = mapped_column(primary_key=True,index=True)
    name : Mapped[str] = mapped_column(String(100),unique=True,nullable=False)
    description : Mapped[str|None] = mapped_column(String(500),nullable=True)

    #Relationships
    products : Mapped[List["Product"]] = relationship("Product",back_populates="category")

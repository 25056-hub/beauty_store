from sqlalchemy import String,ForeignKey,Numeric,DateTime,Enum as SAEnum
from sqlalchemy.orm import Mapped,mapped_column,relationship
from app.database import Base
import enum
from datetime import datetime
from sqlalchemy.sql import func


class PaymentStatus(enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"

class Payment(Base):
    __tablename__ = "payments"
    id : Mapped[int] = mapped_column(primary_key=True,index=True)
    amount : Mapped[float] = mapped_column(Numeric(10,2))
    status : Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus),default=PaymentStatus.pending)
    created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())
    method : Mapped[str] = mapped_column(String(255),default="stripe")
    order_id : Mapped[int] = mapped_column(ForeignKey("orders.id"))
    transaction_id : Mapped[str | None] = mapped_column(String(255), nullable=True)

    #Relationships
    order : Mapped["Order"] = relationship(back_populates="payment")
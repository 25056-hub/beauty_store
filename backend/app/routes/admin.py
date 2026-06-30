from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.product import Product
from app.models.user import User
from app.utils.auth_helper import get_admin_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _format_order(order: Order) -> dict:
    first_item = order.items[0] if order.items else None
    product = first_item.product if first_item else None
    items_count = sum(item.quantity for item in order.items)

    return {
        "id": order.id,
        "customer": order.user.name if order.user else "Customer",
        "total_price": float(order.total_price),
        "status": order.status.value,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "product_name": product.name if product else "Beauty Product",
        "items_count": items_count,
    }


def _format_pending_payment(payment: Payment) -> dict:
    order = payment.order
    user = order.user if order else None

    return {
        "id": payment.id,
        "order_id": payment.order_id,
        "customer": user.name if user else "Customer",
        "bpay_code": payment.bpay_code,
        "amount": float(payment.amount),
    }


@router.get("/dashboard")
def get_admin_dashboard(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.status == PaymentStatus.success)
        .scalar()
    )
    orders_count = db.query(func.count(Order.id)).scalar()
    customers_count = db.query(func.count(User.id)).scalar()
    products_count = db.query(func.count(Product.id)).scalar()
    pending_bpay_count = (
        db.query(func.count(Payment.id))
        .filter(Payment.status == PaymentStatus.under_review)
        .scalar()
    )
    cancelled_orders = (
        db.query(func.count(Order.id))
        .filter(Order.status == OrderStatus.cancelled)
        .scalar()
    )

    status_counts = {
        status.value: (
            db.query(func.count(Order.id))
            .filter(Order.status == status)
            .scalar()
        )
        for status in OrderStatus
    }
    successful_orders_count = (
        status_counts.get(OrderStatus.paid.value, 0)
        + status_counts.get(OrderStatus.shipped.value, 0)
        + status_counts.get(OrderStatus.delivered.value, 0)
    )
    pending_orders_count = status_counts.get(OrderStatus.pending.value, 0)
    total_orders_for_rate = int(orders_count or 0)
    success_rate = round((successful_orders_count / total_orders_for_rate) * 100, 2) if total_orders_for_rate else 0
    pending_rate = round((pending_orders_count / total_orders_for_rate) * 100, 2) if total_orders_for_rate else 0
    cancelled_rate = round((int(cancelled_orders or 0) / total_orders_for_rate) * 100, 2) if total_orders_for_rate else 0

    recent_orders = (
        db.query(Order)
        .options(
            joinedload(Order.user),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )

    successful_statuses = [
        OrderStatus.paid,
        OrderStatus.shipped,
        OrderStatus.delivered,
    ]

    top_products = (
        db.query(
            Product.id,
            Product.name,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("units_sold"),
            func.coalesce(func.sum(OrderItem.quantity * OrderItem.unit_price), 0).label("revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status.in_(successful_statuses))
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price).desc())
        .limit(3)
        .all()
    )

    top_products_total = sum(float(product.revenue or 0) for product in top_products)
    week_start_date = datetime.utcnow().date() - timedelta(days=6)
    week_start = datetime.combine(week_start_date, datetime.min.time())
    weekly_orders = (
        db.query(Order)
        .filter(Order.created_at >= week_start)
        .filter(Order.status.in_(successful_statuses))
        .all()
    )
    weekly_sales = []
    for day_offset in range(7):
        current_day = week_start_date + timedelta(days=day_offset)
        day_total = sum(
            float(order.total_price)
            for order in weekly_orders
            if order.created_at and order.created_at.date() == current_day
        )
        weekly_sales.append({
            "label": current_day.strftime("%a"),
            "total": day_total,
        })

    pending_payments = (
        db.query(Payment)
        .options(joinedload(Payment.order).joinedload(Order.user))
        .filter(Payment.status == PaymentStatus.under_review)
        .order_by(Payment.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "stats": {
            "revenue": float(revenue or 0),
            "profit": float(revenue or 0),
            "orders": int(orders_count or 0),
            "customers": int(customers_count or 0),
            "products": int(products_count or 0),
            "pending_bpay": int(pending_bpay_count or 0),
            "cancelled_orders": int(cancelled_orders or 0),
            "successful_orders": int(successful_orders_count or 0),
        },
        "status_counts": status_counts,
        "success_rate": success_rate,
        "sales_overview": {
            "successful": success_rate,
            "pending": pending_rate,
            "cancelled": cancelled_rate,
        },
        "weekly_sales": weekly_sales,
        "top_products": [
            {
                "id": product.id,
                "name": product.name,
                "units_sold": int(product.units_sold or 0),
                "revenue": float(product.revenue or 0),
                "percent": round((float(product.revenue or 0) / top_products_total) * 100, 2) if top_products_total else 0,
            }
            for product in top_products
        ],
        "recent_orders": [_format_order(order) for order in recent_orders],
        "pending_payments": [
            _format_pending_payment(payment)
            for payment in pending_payments
        ],
    }


@router.get("/reports")
def get_admin_reports(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.status == PaymentStatus.success)
        .scalar()
    )
    orders_count = db.query(func.count(Order.id)).scalar()
    delivered_orders = (
        db.query(func.count(Order.id))
        .filter(Order.status == OrderStatus.delivered)
        .scalar()
    )
    approved_payments = (
        db.query(func.count(Payment.id))
        .filter(Payment.status == PaymentStatus.success)
        .scalar()
    )
    payments_count = db.query(func.count(Payment.id)).scalar()
    approval_rate = round((approved_payments / payments_count) * 100, 2) if payments_count else 0

    order_status_counts = {
        status.value: int(
            db.query(func.count(Order.id))
            .filter(Order.status == status)
            .scalar()
            or 0
        )
        for status in OrderStatus
    }

    payment_status_counts = {
        status.value: int(
            db.query(func.count(Payment.id))
            .filter(Payment.status == status)
            .scalar()
            or 0
        )
        for status in PaymentStatus
    }

    top_products = (
        db.query(
            Product.id,
            Product.name,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("units_sold"),
            func.coalesce(func.sum(OrderItem.quantity * OrderItem.unit_price), 0).label("revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )

    low_stock_products = (
        db.query(Product)
        .order_by(Product.stock.asc(), Product.name.asc())
        .limit(5)
        .all()
    )

    return {
        "summary": {
            "revenue": float(revenue or 0),
            "orders": int(orders_count or 0),
            "approval_rate": approval_rate,
            "delivered_orders": int(delivered_orders or 0),
        },
        "order_status_counts": order_status_counts,
        "payment_status_counts": payment_status_counts,
        "top_products": [
            {
                "id": product.id,
                "name": product.name,
                "units_sold": int(product.units_sold or 0),
                "revenue": float(product.revenue or 0),
            }
            for product in top_products
        ],
        "low_stock_products": [
            {
                "id": product.id,
                "name": product.name,
                "stock": product.stock,
                "price": float(product.price),
            }
            for product in low_stock_products
        ],
    }

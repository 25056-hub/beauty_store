from decimal import Decimal
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models.category import Category
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.product import Product
from app.models.user import User, UserRole
from app.routes.auth import hash_password


DEMO_CUSTOMER_EMAIL = "customer@beautystore.com"
DEMO_ADMIN_EMAIL = "admin@beautystore.com"
DEMO_PASSWORD = {
    DEMO_CUSTOMER_EMAIL: "Customer123",
    DEMO_ADMIN_EMAIL: "Admin12345",
}

PRODUCTS = [
    {
        "legacy_name": "Rose Glow Serum",
        "name": "Hydra-Gentle Cleansing Foam",
        "category": "Cleanser",
        "description": "Arabic name: رغوة الهيدرا اللطيفة. A soft daily cleansing foam that refreshes skin without stripping moisture.",
        "price": 3900,
        "stock": 24,
        "image_url": "/uploads/products/hydra-gentle-cleansing-foam.png",
    },
    {
        "legacy_name": "Gold Eye Cream",
        "name": "Glow Radiance Toner",
        "category": "Toner",
        "description": "Arabic name: تونر غلو راديانس. A lightweight toner that helps prepare skin for a brighter, smoother routine.",
        "price": 4200,
        "stock": 20,
        "image_url": "/uploads/products/glow-radiance-toner.png",
    },
    {
        "legacy_name": "Velvet Lipstick",
        "name": "Super Radiance Vitamin C Serum",
        "category": "Serum",
        "description": "Arabic name: سيروم النضارة الفائقة - فيتامين سي. A vitamin C serum for a fresher-looking complexion and daily glow support.",
        "price": 6900,
        "stock": 16,
        "image_url": "/uploads/products/super-radiance-vitamin-c-serum.png",
    },
    {
        "legacy_name": "Hyaluronic Acid Serum",
        "name": "Intense Hyaluronic Elixir",
        "category": "Hydration",
        "description": "Arabic name: إكسير الهيالورونيك المكثف. An intensive hyaluronic care product designed to leave skin feeling plump and hydrated.",
        "price": 6400,
        "stock": 14,
        "image_url": "/uploads/products/intense-hyaluronic-elixir.png",
    },
    {
        "legacy_name": "Nourishing Hair Mask",
        "name": "Retinol Renewal Serum",
        "category": "Serum",
        "description": "Arabic name: سيروم الريتينول لتجديد البشرة. A renewal serum with retinol to support a smoother and more refined skin look.",
        "price": 7200,
        "stock": 12,
        "image_url": "/uploads/products/retinol-renewal-serum.png",
    },
    {
        "legacy_name": "Collagen Boosting Cream",
        "name": "Velvet Moisture Cream",
        "category": "Moisturizer",
        "description": "Arabic name: كريم الترطيب المخملي. A velvet-feel moisture cream for soft, comfortable daily hydration.",
        "price": 5200,
        "stock": 18,
        "image_url": "/uploads/products/velvet-moisture-cream.png",
    },
    {
        "name": "Hydra-Boost Refreshing Gel",
        "category": "Hydration",
        "description": "Arabic name: جل هيدرا بوست المنعش. A refreshing water-gel product for a clean, cool, hydrated skin feel.",
        "price": 4800,
        "stock": 21,
        "image_url": "/uploads/products/hydra-boost-refreshing-gel.png",
    },
    {
        "name": "Caffeine Brightening Eye Cream",
        "category": "Eye Care",
        "description": "Arabic name: كريم العين المفتح بالكافيين. A caffeine eye cream made for tired-looking under-eyes and brighter daily care.",
        "price": 4500,
        "stock": 15,
        "image_url": "/uploads/products/caffeine-brightening-eye-cream.png",
    },
    {
        "name": "Detoxifying Clay Mask",
        "category": "Mask",
        "description": "Arabic name: قناع الطين المنقي للسموم. A detoxifying clay mask that helps cleanse the look of daily buildup.",
        "price": 5000,
        "stock": 13,
        "image_url": "/uploads/products/detoxifying-clay-mask.png",
    },
    {
        "name": "Gentle Radiance Scrub",
        "category": "Exfoliator",
        "description": "Arabic name: مقشر الإشراق اللطيف. A gentle scrub that smooths skin texture and supports a brighter-looking glow.",
        "price": 4600,
        "stock": 17,
        "image_url": "/uploads/products/gentle-radiance-scrub.png",
    },
]

ORDERS = [
    {
        "status": OrderStatus.pending,
        "shipping_address": "Demo Seed Address, Nouakchott",
        "items": [("Hydra-Gentle Cleansing Foam", 1), ("Glow Radiance Toner", 1)],
        "payment": None,
    },
    {
        "status": OrderStatus.paid,
        "shipping_address": "Demo Seed Address, Tevragh Zeina",
        "items": [("Super Radiance Vitamin C Serum", 1)],
        "payment": PaymentStatus.success,
    },
    {
        "status": OrderStatus.shipped,
        "shipping_address": "Demo Seed Address, Ksar",
        "items": [("Intense Hyaluronic Elixir", 1), ("Retinol Renewal Serum", 1)],
        "payment": PaymentStatus.success,
    },
    {
        "status": OrderStatus.delivered,
        "shipping_address": "Demo Seed Address, Arafat",
        "items": [("Velvet Moisture Cream", 1), ("Hydra-Boost Refreshing Gel", 1)],
        "payment": PaymentStatus.success,
    },
    {
        "status": OrderStatus.cancelled,
        "shipping_address": "Demo Seed Address, Riyadh",
        "items": [("Gentle Radiance Scrub", 1)],
        "payment": PaymentStatus.rejected,
    },
]


def get_or_create_user(db, *, name, email, role, phone, address):
    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(email=email)
        db.add(user)

    user.name = name
    user.password_hash = hash_password(DEMO_PASSWORD[email])
    user.role = role
    user.phone = phone
    user.address = address
    return user


def get_or_create_category(db, name):
    category = db.query(Category).filter(Category.name == name).first()

    if not category:
        category = Category(name=name, description=f"{name} demo products")
        db.add(category)
        db.flush()

    return category


def upsert_products(db):
    products_by_name = {}

    for product_data in PRODUCTS:
        category = get_or_create_category(db, product_data["category"])
        product = db.query(Product).filter(Product.name == product_data["name"]).first()

        if not product and product_data.get("legacy_name"):
            product = db.query(Product).filter(Product.name == product_data["legacy_name"]).first()

        if not product:
            product = Product(name=product_data["name"])
            db.add(product)

        product.name = product_data["name"]
        product.description = product_data["description"]
        product.price = Decimal(str(product_data["price"]))
        product.stock = product_data["stock"]
        product.image_url = product_data["image_url"]
        product.category = category
        products_by_name[product_data["name"]] = product

    db.flush()
    return products_by_name


def delete_old_demo_orders(db, customer):
    old_orders = (
        db.query(Order)
        .filter(
            Order.user_id == customer.id,
            (
                Order.shipping_address.like("Demo Seed Address%")
                | Order.shipping_address.like("E2E Test Address%")
            ),
        )
        .all()
    )
    old_order_ids = [order.id for order in old_orders]

    if old_order_ids:
        db.query(Payment).filter(Payment.order_id.in_(old_order_ids)).delete(
            synchronize_session=False
        )

    for order in old_orders:
        db.delete(order)

    db.flush()


def next_bpay_code(db, start):
    code = start

    while db.query(Payment).filter(Payment.bpay_code == f"{code:04d}").first():
        code += 1

    return f"{code:04d}"


def create_demo_orders(db, customer, products_by_name):
    for index, order_data in enumerate(ORDERS, start=1):
        total_price = sum(
            Decimal(str(products_by_name[name].price)) * quantity
            for name, quantity in order_data["items"]
        )
        order = Order(
            user_id=customer.id,
            total_price=total_price,
            status=order_data["status"],
            shipping_address=order_data["shipping_address"],
        )
        db.add(order)
        db.flush()

        for name, quantity in order_data["items"]:
            product = products_by_name[name]
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=Decimal(str(product.price)),
                )
            )

        if order_data["payment"]:
            db.add(
                Payment(
                    order_id=order.id,
                    amount=total_price,
                    status=order_data["payment"],
                    method="bankily_bpay",
                    bpay_code=next_bpay_code(db, 9100 + index),
                )
            )


def seed_demo_data():
    db = SessionLocal()

    try:
        customer = get_or_create_user(
            db,
            name="Beauty Customer",
            email=DEMO_CUSTOMER_EMAIL,
            role=UserRole.customer,
            phone="45223344",
            address="Nouakchott",
        )
        get_or_create_user(
            db,
            name="Beauty Admin",
            email=DEMO_ADMIN_EMAIL,
            role=UserRole.admin,
            phone="45223345",
            address="Nouakchott",
        )
        db.flush()

        products_by_name = upsert_products(db)
        delete_old_demo_orders(db, customer)
        create_demo_orders(db, customer, products_by_name)

        db.commit()
        print("Demo data created successfully")
        print(f"Admin: {DEMO_ADMIN_EMAIL} / {DEMO_PASSWORD[DEMO_ADMIN_EMAIL]}")
        print(f"User: {DEMO_CUSTOMER_EMAIL} / {DEMO_PASSWORD[DEMO_CUSTOMER_EMAIL]}")
        print(f"Products: {len(PRODUCTS)}")
        print(f"Orders: {len(ORDERS)}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()

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
        "name": "Rose Glow Serum",
        "category": "Skincare",
        "description": "Light serum for radiant daily hydration.",
        "price": 4500,
        "stock": 18,
        "image_url": "/file_00000000024471f4824f92dd1a4e6d44.png",
    },
    {
        "name": "Gold Eye Cream",
        "category": "Skincare",
        "description": "Soft eye cream for a fresh under-eye look.",
        "price": 6800,
        "stock": 12,
        "image_url": "/file_000000002fb071f4846f3e2aef16d40d.png",
    },
    {
        "name": "Velvet Lipstick",
        "category": "Makeup",
        "description": "Creamy lipstick with a soft velvet finish.",
        "price": 2900,
        "stock": 25,
        "image_url": "/file_000000004c4871f491e266b7761a04f7.png",
    },
    {
        "name": "Hyaluronic Acid Serum",
        "category": "Skincare",
        "description": "Hydrating serum for smooth glowing skin.",
        "price": 5900,
        "stock": 15,
        "image_url": "/file_000000004e3c71f4b89cdba210b3c5b6.png",
    },
    {
        "name": "Nourishing Hair Mask",
        "category": "Hair Care",
        "description": "Rich mask for soft and nourished hair.",
        "price": 4900,
        "stock": 9,
        "image_url": "/file_00000000a0c071f48d3ada2e41d3f6ad.png",
    },
    {
        "name": "Collagen Boosting Cream",
        "category": "Skincare",
        "description": "Daily cream with a smooth collagen-care feel.",
        "price": 5500,
        "stock": 7,
        "image_url": "/file_00000000a48871f48d57f1e017fd30b2.png",
    },
]

ORDERS = [
    {
        "status": OrderStatus.pending,
        "shipping_address": "Demo Seed Address, Nouakchott",
        "items": [("Rose Glow Serum", 1), ("Velvet Lipstick", 2)],
        "payment": None,
    },
    {
        "status": OrderStatus.paid,
        "shipping_address": "Demo Seed Address, Tevragh Zeina",
        "items": [("Gold Eye Cream", 1)],
        "payment": PaymentStatus.success,
    },
    {
        "status": OrderStatus.shipped,
        "shipping_address": "Demo Seed Address, Ksar",
        "items": [("Hyaluronic Acid Serum", 1), ("Nourishing Hair Mask", 1)],
        "payment": PaymentStatus.success,
    },
    {
        "status": OrderStatus.delivered,
        "shipping_address": "Demo Seed Address, Arafat",
        "items": [("Collagen Boosting Cream", 2)],
        "payment": PaymentStatus.success,
    },
    {
        "status": OrderStatus.cancelled,
        "shipping_address": "Demo Seed Address, Riyadh",
        "items": [("Velvet Lipstick", 1)],
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

        if not product:
            product = Product(name=product_data["name"])
            db.add(product)

        product.description = product_data["description"]
        product.price = Decimal(str(product_data["price"]))
        product.stock = product_data["stock"]
        product.image_url = product_data["image_url"]
        product.category = category
        products_by_name[product.name] = product

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

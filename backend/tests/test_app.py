import unittest

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models
from app.database import Base
from app.main import app
from app.models.cart import CartItem
from app.models.category import Category
from app.models.order import Order, OrderStatus
from app.models.payment import PaymentStatus
from app.models.product import Product
from app.models.user import User, UserRole
from app.routes.auth import _auth_attempts, login, register
from app.routes.cart import add_to_cart
from app.routes.orders import create_order
from app.routes.payments import review_payment, submit_bpay_payment
from app.schemas.user import UserLogin, UserRegister
from app.schemas.cart import CartAddItem
from app.schemas.order import OrderCreate, OrderUpdateStatus
from app.schemas.payment import PaymentCreate, PaymentReview
from app.utils.auth_helper import decode_token, revoke_token


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine)


class AppMainTests(unittest.TestCase):
    def test_expected_routes_are_registered(self):
        paths = {route.path for route in app.routes}

        self.assertIn("/", paths)
        self.assertIn("/api/auth/login", paths)
        self.assertIn("/api/categories/", paths)
        self.assertIn("/api/products/", paths)
        self.assertIn("/api/cart/add", paths)
        self.assertIn("/api/orders/create", paths)
        self.assertIn("/api/payments/submit", paths)
        self.assertIn("/api/payments/admin/pending", paths)


class PaymentSchemaTests(unittest.TestCase):
    def test_bpay_code_must_be_four_digits(self):
        valid_payment = PaymentCreate(order_id=1, bpay_code="1234")

        self.assertEqual(valid_payment.bpay_code, "1234")

        with self.assertRaises(ValidationError):
            PaymentCreate(order_id=1, bpay_code="abcd")

        with self.assertRaises(ValidationError):
            PaymentCreate(order_id=1, bpay_code="123")

    def test_admin_review_status_is_limited(self):
        valid_review = PaymentReview(status="success")

        self.assertEqual(valid_review.status, "success")

        with self.assertRaises(ValidationError):
            PaymentReview(status="pending")


class OrderSchemaTests(unittest.TestCase):
    def test_order_update_status_is_limited(self):
        valid_status = OrderUpdateStatus(status="paid")

        self.assertEqual(valid_status.status, "paid")

        with self.assertRaises(ValidationError):
            OrderUpdateStatus(status="unknown")


class DatabaseFlowTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()

        self.user = User(
            name="Customer",
            email="customer@example.com",
            password_hash="hash",
            role=UserRole.customer,
        )
        self.admin = User(
            name="Admin",
            email="admin@example.com",
            password_hash="hash",
            role=UserRole.admin,
        )
        self.category = Category(name="Skin Care")
        self.product = Product(
            name="Cream",
            description="Daily cream",
            price=10,
            stock=5,
            category=self.category,
        )

        self.db.add_all([self.user, self.admin, self.category, self.product])
        self.db.commit()
        self.db.refresh(self.user)
        self.db.refresh(self.admin)
        self.db.refresh(self.product)

    def tearDown(self):
        _auth_attempts.clear()
        self.db.close()

    def test_register_and_login_return_tokens(self):
        _auth_attempts.clear()

        register_response = register(
            user_data=UserRegister(
                name="New User",
                email="new@example.com",
                password="password123",
                phone="12345678",
                address="Main Street",
            ),
            db=self.db,
        )

        login_response = login(
            user_data=UserLogin(
                email="new@example.com",
                password="password123",
            ),
            db=self.db,
        )

        self.assertEqual(register_response.token_type, "bearer")
        self.assertTrue(register_response.access_token)
        self.assertTrue(login_response.access_token)

    def test_login_rate_limit_blocks_repeated_attempts(self):
        _auth_attempts.clear()

        for _ in range(5):
            with self.assertRaises(Exception):
                login(
                    user_data=UserLogin(
                        email="missing@example.com",
                        password="password123",
                    ),
                    db=self.db,
                )

        with self.assertRaises(Exception) as context:
            login(
                user_data=UserLogin(
                    email="missing@example.com",
                    password="password123",
                ),
                db=self.db,
            )

        self.assertEqual(context.exception.status_code, 429)

    def test_revoked_token_is_rejected(self):
        token = register(
            user_data=UserRegister(
                name="Logout User",
                email="logout@example.com",
                password="password123",
                phone="12345678",
                address="Main Street",
            ),
            db=self.db,
        ).access_token

        revoke_token(token)

        with self.assertRaises(Exception) as context:
            decode_token(token)

        self.assertEqual(context.exception.status_code, 401)

    def test_create_order_decrements_stock_and_clears_cart(self):
        add_to_cart(
            item_data=CartAddItem(product_id=self.product.id, quantity=2),
            current_user=self.user,
            db=self.db,
        )

        order = create_order(
            order_data=OrderCreate(shipping_address="Main Street"),
            current_user=self.user,
            db=self.db,
        )

        self.db.refresh(self.product)

        remaining_cart_items = (
            self.db.query(CartItem)
            .filter(CartItem.user_id == self.user.id)
            .count()
        )

        self.assertEqual(self.product.stock, 3)
        self.assertEqual(remaining_cart_items, 0)
        self.assertEqual(len(order.items), 1)
        self.assertEqual(order.items[0].quantity, 2)

    def test_bpay_admin_approval_marks_order_paid(self):
        order = Order(
            user_id=self.user.id,
            total_price=20,
            shipping_address="Main Street",
            status=OrderStatus.pending,
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        payment = submit_bpay_payment(
            payment_data=PaymentCreate(order_id=order.id, bpay_code="1234"),
            current_user=self.user,
            db=self.db,
        )

        self.assertEqual(payment.status, PaymentStatus.under_review)

        reviewed_payment = review_payment(
            payment_id=payment.id,
            review_data=PaymentReview(status="success"),
            admin_user=self.admin,
            db=self.db,
        )

        self.db.refresh(order)

        self.assertEqual(reviewed_payment.status, PaymentStatus.success)
        self.assertEqual(order.status, OrderStatus.paid)


if __name__ == "__main__":
    unittest.main()

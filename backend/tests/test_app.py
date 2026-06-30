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
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.product import Product
from app.models.user import User, UserRole
from app.routes.admin import get_admin_dashboard, get_admin_reports
from app.routes.auth import _auth_attempts, get_admin_users, get_me, hash_password, login, register, update_admin_user_role, update_me, update_my_password
from app.routes.cart import add_to_cart
from app.routes.checkout import create_checkout
from app.routes.orders import create_order, get_admin_orders, update_order_status
from app.routes.payments import review_payment, submit_bpay_payment
from app.routes.products import _build_product_image_name, add_product, update_product
from app.schemas.checkout import CheckoutCreate
from app.schemas.user import UserLogin, UserPasswordUpdate, UserRegister, UserResponse, UserRoleUpdate, UserUpdate
from app.schemas.cart import CartAddItem
from app.schemas.order import OrderCreate, OrderUpdateStatus
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentReview
from app.schemas.product import ProductCreate, ProductUpdate
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
        self.assertIn("/api/admin/dashboard", paths)
        self.assertIn("/api/admin/reports", paths)
        self.assertIn("/api/auth/me", paths)
        self.assertIn("/api/auth/admin/users", paths)
        self.assertIn("/api/auth/admin/users/{user_id}/role", paths)
        self.assertIn("/api/auth/login", paths)
        self.assertIn("/api/categories/", paths)
        self.assertIn("/api/products/", paths)
        self.assertIn("/api/products/upload-image", paths)
        self.assertIn("/api/cart/add", paths)
        self.assertIn("/api/checkout", paths)
        self.assertIn("/api/orders/admin/all", paths)
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

    def test_payment_response_accepts_payment_status_enum(self):
        response = PaymentResponse(
            id=1,
            order_id=1,
            amount=100,
            status=PaymentStatus.under_review,
            method="bankily_bpay",
            bpay_code="1234",
            created_at="2026-06-27T00:00:00",
        )

        self.assertEqual(response.model_dump()["status"], "under_review")


class OrderSchemaTests(unittest.TestCase):
    def test_order_update_status_is_limited(self):
        valid_status = OrderUpdateStatus(status="paid")

        self.assertEqual(valid_status.status, "paid")

        with self.assertRaises(ValidationError):
            OrderUpdateStatus(status="unknown")


class UserSchemaTests(unittest.TestCase):
    def test_user_response_allows_existing_legacy_email_values(self):
        response = UserResponse(
            id=1,
            name="Legacy User",
            email="legacy@beautystore.local",
            role="customer",
            created_at="2026-06-27T00:00:00",
        )

        self.assertEqual(response.email, "legacy@beautystore.local")


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

    def test_get_me_returns_current_user_profile(self):
        profile = get_me(current_user=self.user)

        self.assertEqual(profile["id"], self.user.id)
        self.assertEqual(profile["email"], "customer@example.com")
        self.assertEqual(profile["role"], "customer")

    def test_update_me_updates_editable_profile_fields(self):
        profile = update_me(
            user_data=UserUpdate(
                name="Updated Customer",
                phone="87654321",
                address="New Address",
            ),
            current_user=self.user,
            db=self.db,
        )

        self.db.refresh(self.user)

        self.assertEqual(profile["name"], "Updated Customer")
        self.assertEqual(profile["phone"], "87654321")
        self.assertEqual(profile["address"], "New Address")
        self.assertEqual(self.user.email, "customer@example.com")

    def test_update_my_password_requires_current_password(self):
        self.user.password_hash = hash_password("oldpass123")
        self.db.commit()

        with self.assertRaises(Exception) as context:
            update_my_password(
                password_data=UserPasswordUpdate(
                    current_password="wrongpass",
                    new_password="newpass123",
                ),
                current_user=self.user,
                db=self.db,
            )

        self.assertEqual(context.exception.status_code, 400)

        response = update_my_password(
            password_data=UserPasswordUpdate(
                current_password="oldpass123",
                new_password="newpass123",
            ),
            current_user=self.user,
            db=self.db,
        )

        login_response = login(
            user_data=UserLogin(
                email="customer@example.com",
                password="newpass123",
            ),
            db=self.db,
        )

        self.assertEqual(response["message"], "Password updated successfully")
        self.assertTrue(login_response.access_token)

    def test_admin_users_returns_order_counts(self):
        order = Order(
            user_id=self.user.id,
            total_price=20,
            shipping_address="Main Street",
            status=OrderStatus.pending,
        )
        self.db.add(order)
        self.db.commit()

        users = get_admin_users(admin_user=self.admin, db=self.db)
        customer = next(user for user in users if user["email"] == "customer@example.com")

        self.assertEqual(customer["orders_count"], 1)
        self.assertEqual(customer["role"], "customer")

    def test_admin_can_update_user_role(self):
        updated_user = update_admin_user_role(
            user_id=self.user.id,
            role_data=UserRoleUpdate(role="admin"),
            admin_user=self.admin,
            db=self.db,
        )

        self.db.refresh(self.user)

        self.assertEqual(updated_user["role"], "admin")
        self.assertEqual(self.user.role, UserRole.admin)

    def test_admin_cannot_remove_own_admin_role(self):
        with self.assertRaises(Exception) as context:
            update_admin_user_role(
                user_id=self.admin.id,
                role_data=UserRoleUpdate(role="customer"),
                admin_user=self.admin,
                db=self.db,
            )

        self.assertEqual(context.exception.status_code, 400)

    def test_product_image_url_can_be_created_and_updated(self):
        product = add_product(
            product_data=ProductCreate(
                name="Serum",
                description="Glow serum",
                price=15,
                stock=10,
                category_id=self.category.id,
                image_url="/serum.png",
            ),
            admin=self.admin,
            db=self.db,
        )

        self.assertEqual(product.image_url, "/serum.png")

        updated_product = update_product(
            id=product.id,
            product_data=ProductUpdate(
                name="Serum",
                description="Glow serum",
                price=15,
                stock=10,
                category_id=self.category.id,
                image_url="/serum-new.png",
            ),
            admin=self.admin,
            db=self.db,
        )

        self.assertEqual(updated_product.image_url, "/serum-new.png")

    def test_product_image_upload_rejects_unsupported_extensions(self):
        with self.assertRaises(Exception) as context:
            _build_product_image_name("product.gif")

        self.assertEqual(context.exception.status_code, 400)

    def test_admin_orders_returns_all_customer_orders(self):
        order = Order(
            user_id=self.user.id,
            total_price=20,
            shipping_address="Main Street",
            status=OrderStatus.pending,
        )
        self.db.add(order)
        self.db.commit()

        orders = get_admin_orders(admin_user=self.admin, skip=0, limit=50, db=self.db)

        self.assertEqual(len(orders), 1)
        self.assertEqual(orders[0].user.email, "customer@example.com")

    def test_admin_order_status_rejects_invalid_transition(self):
        order = Order(
            user_id=self.user.id,
            total_price=20,
            shipping_address="Main Street",
            status=OrderStatus.pending,
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        with self.assertRaises(Exception) as context:
            update_order_status(
                order_id=order.id,
                update_data=OrderUpdateStatus(status="delivered"),
                admin_user=self.admin,
                db=self.db,
            )

        self.db.refresh(order)

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(order.status, OrderStatus.pending)

    def test_admin_order_status_allows_fulfillment_path(self):
        order = Order(
            user_id=self.user.id,
            total_price=20,
            shipping_address="Main Street",
            status=OrderStatus.paid,
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        shipped_order = update_order_status(
            order_id=order.id,
            update_data=OrderUpdateStatus(status="shipped"),
            admin_user=self.admin,
            db=self.db,
        )
        self.assertEqual(shipped_order.status, OrderStatus.shipped)

        delivered_order = update_order_status(
            order_id=order.id,
            update_data=OrderUpdateStatus(status="delivered"),
            admin_user=self.admin,
            db=self.db,
        )

        self.assertEqual(delivered_order.status, OrderStatus.delivered)

    def test_admin_order_status_prevents_changes_after_cancelled(self):
        order = Order(
            user_id=self.user.id,
            total_price=20,
            shipping_address="Main Street",
            status=OrderStatus.cancelled,
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        with self.assertRaises(Exception) as context:
            update_order_status(
                order_id=order.id,
                update_data=OrderUpdateStatus(status="shipped"),
                admin_user=self.admin,
                db=self.db,
            )

        self.db.refresh(order)

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(order.status, OrderStatus.cancelled)

    def test_admin_dashboard_returns_live_stats(self):
        paid_order = Order(
            user_id=self.user.id,
            total_price=20,
            shipping_address="Main Street",
            status=OrderStatus.paid,
        )
        pending_order = Order(
            user_id=self.user.id,
            total_price=30,
            shipping_address="Second Street",
            status=OrderStatus.pending,
        )
        self.db.add_all([paid_order, pending_order])
        self.db.commit()
        self.db.refresh(paid_order)
        self.db.refresh(pending_order)

        self.db.add_all([
            Payment(
                order_id=paid_order.id,
                amount=20,
                status=PaymentStatus.success,
                bpay_code="1234",
            ),
            Payment(
                order_id=pending_order.id,
                amount=30,
                status=PaymentStatus.under_review,
                bpay_code="5678",
            ),
        ])
        self.db.commit()

        dashboard = get_admin_dashboard(admin_user=self.admin, db=self.db)

        self.assertEqual(dashboard["stats"]["revenue"], 20)
        self.assertEqual(dashboard["stats"]["orders"], 2)
        self.assertEqual(dashboard["stats"]["pending_bpay"], 1)
        self.assertEqual(dashboard["status_counts"]["paid"], 1)
        self.assertEqual(len(dashboard["recent_orders"]), 2)
        self.assertEqual(len(dashboard["pending_payments"]), 1)

    def test_admin_reports_returns_store_analytics(self):
        order = Order(
            user_id=self.user.id,
            total_price=20,
            shipping_address="Main Street",
            status=OrderStatus.delivered,
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        self.db.add_all([
            OrderItem(
                order_id=order.id,
                product_id=self.product.id,
                quantity=2,
                unit_price=10,
            ),
            Payment(
                order_id=order.id,
                amount=20,
                status=PaymentStatus.success,
                bpay_code="1234",
            ),
        ])
        self.db.commit()

        reports = get_admin_reports(admin_user=self.admin, db=self.db)

        self.assertEqual(reports["summary"]["revenue"], 20)
        self.assertEqual(reports["summary"]["orders"], 1)
        self.assertEqual(reports["summary"]["approval_rate"], 100)
        self.assertEqual(reports["summary"]["delivered_orders"], 1)
        self.assertEqual(reports["top_products"][0]["units_sold"], 2)
        self.assertEqual(reports["low_stock_products"][0]["name"], "Cream")

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

    def test_checkout_creates_order_payment_decrements_stock_and_clears_cart(self):
        add_to_cart(
            item_data=CartAddItem(product_id=self.product.id, quantity=2),
            current_user=self.user,
            db=self.db,
        )

        checkout = create_checkout(
            checkout_data=CheckoutCreate(
                shipping_address="Main Street",
                bpay_code="1234",
            ),
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
        self.assertEqual(checkout["order"].status, OrderStatus.pending)
        self.assertEqual(checkout["payment"].status, PaymentStatus.under_review)
        self.assertEqual(checkout["payment"].bpay_code, "1234")

    def test_checkout_duplicate_bpay_keeps_cart_and_stock_unchanged(self):
        existing_order = Order(
            user_id=self.user.id,
            total_price=10,
            shipping_address="Main Street",
            status=OrderStatus.pending,
        )
        self.db.add(existing_order)
        self.db.commit()
        self.db.refresh(existing_order)
        self.db.add(
            Payment(
                order_id=existing_order.id,
                amount=10,
                status=PaymentStatus.under_review,
                bpay_code="1234",
            )
        )
        self.db.commit()

        add_to_cart(
            item_data=CartAddItem(product_id=self.product.id, quantity=2),
            current_user=self.user,
            db=self.db,
        )

        with self.assertRaises(Exception) as context:
            create_checkout(
                checkout_data=CheckoutCreate(
                    shipping_address="Second Street",
                    bpay_code="1234",
                ),
                current_user=self.user,
                db=self.db,
            )

        self.db.refresh(self.product)
        remaining_cart_items = (
            self.db.query(CartItem)
            .filter(CartItem.user_id == self.user.id)
            .count()
        )
        order_count = self.db.query(Order).count()

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(self.product.stock, 5)
        self.assertEqual(remaining_cart_items, 1)
        self.assertEqual(order_count, 1)

    def test_checkout_out_of_stock_keeps_cart_and_does_not_create_order(self):
        add_to_cart(
            item_data=CartAddItem(product_id=self.product.id, quantity=5),
            current_user=self.user,
            db=self.db,
        )
        self.product.stock = 1
        self.db.commit()

        with self.assertRaises(Exception) as context:
            create_checkout(
                checkout_data=CheckoutCreate(
                    shipping_address="Main Street",
                    bpay_code="1234",
                ),
                current_user=self.user,
                db=self.db,
            )

        self.db.refresh(self.product)
        remaining_cart_items = (
            self.db.query(CartItem)
            .filter(CartItem.user_id == self.user.id)
            .count()
        )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(self.product.stock, 1)
        self.assertEqual(remaining_cart_items, 1)
        self.assertEqual(self.db.query(Order).count(), 0)
        self.assertEqual(self.db.query(Payment).count(), 0)

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

    def test_bpay_admin_rejection_cancels_order_and_restores_stock(self):
        add_to_cart(
            item_data=CartAddItem(product_id=self.product.id, quantity=2),
            current_user=self.user,
            db=self.db,
        )
        checkout = create_checkout(
            checkout_data=CheckoutCreate(
                shipping_address="Main Street",
                bpay_code="1234",
            ),
            current_user=self.user,
            db=self.db,
        )

        self.db.refresh(self.product)
        self.assertEqual(self.product.stock, 3)

        reviewed_payment = review_payment(
            payment_id=checkout["payment"].id,
            review_data=PaymentReview(status="rejected", admin_note="Code not found"),
            admin_user=self.admin,
            db=self.db,
        )

        self.db.refresh(self.product)
        self.db.refresh(checkout["order"])

        self.assertEqual(reviewed_payment.status, PaymentStatus.rejected)
        self.assertEqual(checkout["order"].status, OrderStatus.cancelled)
        self.assertEqual(self.product.stock, 5)

    def test_reviewed_payment_cannot_be_reviewed_twice(self):
        add_to_cart(
            item_data=CartAddItem(product_id=self.product.id, quantity=2),
            current_user=self.user,
            db=self.db,
        )
        checkout = create_checkout(
            checkout_data=CheckoutCreate(
                shipping_address="Main Street",
                bpay_code="1234",
            ),
            current_user=self.user,
            db=self.db,
        )

        review_payment(
            payment_id=checkout["payment"].id,
            review_data=PaymentReview(status="rejected"),
            admin_user=self.admin,
            db=self.db,
        )

        with self.assertRaises(Exception) as context:
            review_payment(
                payment_id=checkout["payment"].id,
                review_data=PaymentReview(status="rejected"),
                admin_user=self.admin,
                db=self.db,
            )

        self.db.refresh(self.product)

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(self.product.stock, 5)


if __name__ == "__main__":
    unittest.main()

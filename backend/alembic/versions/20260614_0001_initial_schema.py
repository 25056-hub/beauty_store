"""initial schema

Revision ID: 20260614_0001
Revises:
Create Date: 2026-06-14
"""

from alembic import op
import sqlalchemy as sa


revision = "20260614_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    user_role = sa.Enum("customer", "admin", name="userrole")
    order_status = sa.Enum(
        "pending",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        name="orderstatus",
    )
    payment_status = sa.Enum(
        "pending",
        "success",
        "failed",
        "rejected",
        "under_review",
        name="paymentstatus",
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=250), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("address", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_id", "users", ["id"])

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_categories_id", "categories", ["id"])

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=200), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_id", "products", ["id"])

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("total_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", order_status, nullable=False),
        sa.Column("shipping_address", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orders_id", "orders", ["id"])

    op.create_table(
        "cart_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "product_id"),
    )
    op.create_index("ix_cart_items_id", "cart_items", ["id"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_id", "order_items", ["id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", payment_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("method", sa.String(length=255), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("bpay_code", sa.String(length=4), nullable=False),
        sa.Column("admin_note", sa.String(length=255), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bpay_code"),
        sa.UniqueConstraint("order_id"),
    )
    op.create_index("ix_payments_id", "payments", ["id"])


def downgrade():
    op.drop_index("ix_payments_id", table_name="payments")
    op.drop_table("payments")
    op.drop_index("ix_order_items_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_cart_items_id", table_name="cart_items")
    op.drop_table("cart_items")
    op.drop_index("ix_orders_id", table_name="orders")
    op.drop_table("orders")
    op.drop_index("ix_products_id", table_name="products")
    op.drop_table("products")
    op.drop_index("ix_categories_id", table_name="categories")
    op.drop_table("categories")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")

    sa.Enum(name="paymentstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="orderstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)

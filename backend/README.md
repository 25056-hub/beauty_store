# Beauty Store Backend

FastAPI backend for the beauty store project. It includes auth, products,
categories, cart, orders, and Bankily B-pay manual payment review.

## Requirements

- Python 3.14
- MySQL
- Virtual environment in `backend/venv`

## Setup

From the `backend` folder:

```powershell
venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create a `.env` file from `.env.example`:

```env
DATABASE_URL=mysql+pymysql://root:your_password@localhost/beauty_store
SECRET_KEY=your_secret_code
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
BANKILY_BPAY=...
```

`DATABASE_URL` must point to an existing MySQL database. If the database does
not exist yet, create it first:

```sql
CREATE DATABASE beauty_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Database Migrations

This backend uses Alembic. Do not use `Base.metadata.create_all()` for normal
development anymore.

Run migrations:

```powershell
venv\Scripts\alembic.exe upgrade head
```

Check current migration:

```powershell
venv\Scripts\alembic.exe current
```

Create a new migration after changing models:

```powershell
venv\Scripts\alembic.exe revision --autogenerate -m "describe change"
```

Then review the generated file before applying it.

## Run Server

From the `backend` folder:

```powershell
venv\Scripts\uvicorn.exe app.main:app --reload
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Run Tests

```powershell
venv\Scripts\python.exe -m unittest discover -s tests -v
```

The tests use an in-memory SQLite database only for test isolation. The real
application uses the MySQL database from `DATABASE_URL`.

## Main Routes

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

GET  /api/products/
POST /api/products/
PUT  /api/products/{id}
DELETE /api/products/{id}

GET  /api/categories/
POST /api/categories/
DELETE /api/categories/{id}

GET  /api/cart
POST /api/cart/add
PUT  /api/cart/update/{item_id}
DELETE /api/cart/remove/{item_id}

GET  /api/orders
GET  /api/orders/{order_id}
POST /api/orders/create
PUT  /api/orders/{order_id}/status

POST /api/payments/submit
GET  /api/payments/{order_id}
GET  /api/payments/admin/pending
PUT  /api/payments/admin/{payment_id}/review
```

List endpoints support pagination with:

```text
?skip=0&limit=20
```

## Payment Flow

Payments use Bankily B-pay manual review:

1. Customer creates an order.
2. Customer pays with Bankily B-pay.
3. Customer submits the 4-digit `bpay_code`.
4. Payment status becomes `under_review`.
5. Admin reviews the code.
6. If approved, payment becomes `success` and the order becomes `paid`.
7. If rejected, payment becomes `rejected`.

## Auth Notes

- Passwords are hashed with `bcrypt`.
- Login/register have a simple in-memory rate limit.
- Logout revokes the current JWT in memory.

For production with multiple server processes, move rate limits and revoked
tokens to a shared store such as Redis.

## Current Production Notes

- CORS is not enabled yet because frontend stack is not finalized.
- Logging is enabled for request method, path, status, and duration.
- Alembic is the source of truth for schema changes.

import logging
from time import perf_counter

from fastapi import FastAPI, Request

from app.routes import auth, cart, categories, orders, payments, products

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("beauty_store.api")

app = FastAPI(title="Beauty Store API")

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(payments.router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = perf_counter()
    response = await call_next(request)
    duration_ms = (perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %s %.2fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.get("/")
def health_check():
    return {"status": "ok"}

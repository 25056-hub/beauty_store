import os
import time
import uuid

import requests


BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8001")


def wait_for_server(timeout_seconds=20):
    deadline = time.perf_counter() + timeout_seconds
    last_error = None

    while time.perf_counter() < deadline:
        try:
            response = requests.get(f"{BASE_URL}/", timeout=2)
            if response.status_code == 200:
                return
        except requests.RequestException as exc:
            last_error = exc
            time.sleep(0.5)

    raise RuntimeError(f"API server did not become ready: {last_error}")


def timed_request(results, method, path, **kwargs):
    url = f"{BASE_URL}{path}"
    start = time.perf_counter()

    try:
        response = requests.request(method, url, timeout=10, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        results.append((method, path, response.status_code, elapsed_ms))
        return response
    except requests.RequestException:
        elapsed_ms = (time.perf_counter() - start) * 1000
        results.append((method, path, "ERROR", elapsed_ms))
        raise


def main():
    wait_for_server()

    results = []
    suffix = uuid.uuid4().hex[:8]
    email = f"api_test_{suffix}@example.com"
    password = "password123"

    timed_request(results, "GET", "/")
    timed_request(results, "GET", "/api/products/?skip=0&limit=20")
    timed_request(results, "GET", "/api/categories/?skip=0&limit=20")

    register = timed_request(
        results,
        "POST",
        "/api/auth/register",
        json={
            "name": "API Test User",
            "email": email,
            "password": password,
            "phone": "12345678",
            "address": "Timing Street",
        },
    )

    token = register.json().get("access_token") if register.ok else None

    login = timed_request(
        results,
        "POST",
        "/api/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    if login.ok:
        token = login.json().get("access_token")

    headers = {"Authorization": f"Bearer {token}"} if token else {}
    timed_request(results, "GET", "/api/cart", headers=headers)
    timed_request(results, "GET", "/api/orders?skip=0&limit=20", headers=headers)
    timed_request(results, "POST", "/api/auth/logout", headers=headers)

    print("API Timing Report")
    print("method,path,status,time_ms")
    for method, path, status_code, elapsed_ms in results:
        print(f"{method},{path},{status_code},{elapsed_ms:.2f}")

    successful = [
        elapsed_ms
        for _, _, status_code, elapsed_ms in results
        if isinstance(status_code, int) and 200 <= status_code < 400
    ]

    if successful:
        print(f"success_count,{len(successful)}")
        print(f"avg_success_ms,{sum(successful) / len(successful):.2f}")
        print(f"max_success_ms,{max(successful):.2f}")


if __name__ == "__main__":
    main()

import { expect, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:8000";
const CUSTOMER_EMAIL = "customer@beautystore.com";
const CUSTOMER_PASSWORD = "Customer123";
const ADMIN_EMAIL = "admin@beautystore.com";
const ADMIN_PASSWORD = "Admin12345";
const TOKEN_KEY = "beauty_store_token";
const GUEST_CART_KEY = "beauty_store_guest_cart";

async function loginWithApi(request, email, password) {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  return body.access_token;
}

async function clearCustomerCart(request) {
  const token = await loginWithApi(request, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };
  const cartResponse = await request.get(`${API_URL}/api/cart`, {
    headers: authHeaders,
  });

  expect(cartResponse.ok()).toBeTruthy();

  const cart = await cartResponse.json();

  for (const item of cart.items) {
    const deleteResponse = await request.delete(`${API_URL}/api/cart/remove/${item.id}`, {
      headers: authHeaders,
    });
    expect(deleteResponse.ok()).toBeTruthy();
  }

  return token;
}

async function loginWithPage(page, email, password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

function buildBpayCode(offset = 0) {
  return String(1000 + ((Date.now() + offset) % 9000)).padStart(4, "0");
}

async function clearBrowserToken(page) {
  await page.goto("/");
  await page.evaluate(({ tokenKey, guestCartKey }) => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(guestCartKey);
  }, { tokenKey: TOKEN_KEY, guestCartKey: GUEST_CART_KEY });
}

async function checkoutSingleProduct(page, request, bpayCode) {
  const customerToken = await clearCustomerCart(request);
  await clearBrowserToken(page);

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Our Products" })).toBeVisible();

  const firstProduct = page.locator(".shop-catalog-card").first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.getByRole("link").click();

  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page.getByText("Product added to cart.")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Shopping Cart" })).toBeVisible();
  await page.getByRole("link", { name: /checkout/i }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(CUSTOMER_EMAIL);
  await page.getByLabel("Password").fill(CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel("Full Name").fill("Beauty Customer");
  await page.getByLabel("Bankily Phone Number").fill("45223344");
  await page.getByLabel("Address").fill("E2E Test Address");
  await page.getByLabel("B-pay code").fill(bpayCode);
  await page.getByRole("button", { name: /continue to review/i }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmation$/);
  await expect(page.getByRole("heading", { name: "Order Submitted" })).toBeVisible();
  await expect(page.getByText(/waiting for admin approval/i)).toBeVisible();

  const ordersResponse = await request.get(`${API_URL}/api/orders?limit=1`, {
    headers: {
      Authorization: `Bearer ${customerToken}`,
    },
  });
  expect(ordersResponse.ok()).toBeTruthy();

  const orders = await ordersResponse.json();
  expect(orders.length).toBeGreaterThan(0);

  return {
    customerToken,
    order: orders[0],
  };
}

async function reviewPaymentInAdmin(page, bpayCode, actionName) {
  await clearBrowserToken(page);
  await loginWithPage(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin/payments");

  await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
  await page.getByPlaceholder("Search payment").fill(bpayCode);

  const paymentRow = page.locator("tbody tr").filter({ hasText: bpayCode });
  await expect(paymentRow).toBeVisible();
  await paymentRow.getByRole("button", { name: actionName }).click();
  await expect(paymentRow).toHaveCount(0);
}

async function getCustomerOrder(request, customerToken, orderId) {
  const orderResponse = await request.get(`${API_URL}/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${customerToken}`,
    },
  });
  expect(orderResponse.ok()).toBeTruthy();

  return orderResponse.json();
}

test("customer can checkout with Bankily and admin can approve payment", async ({ page, request }) => {
  const bpayCode = buildBpayCode();
  const { customerToken, order } = await checkoutSingleProduct(page, request, bpayCode);

  await reviewPaymentInAdmin(page, bpayCode, /approve/i);

  const approvedOrder = await getCustomerOrder(request, customerToken, order.id);
  expect(approvedOrder.status).toBe("paid");
});

test("admin can reject Bankily payment and the customer order is cancelled", async ({ page, request }) => {
  const bpayCode = buildBpayCode(100);
  const { customerToken, order } = await checkoutSingleProduct(page, request, bpayCode);

  await reviewPaymentInAdmin(page, bpayCode, /reject/i);

  const rejectedOrder = await getCustomerOrder(request, customerToken, order.id);
  expect(rejectedOrder.status).toBe("cancelled");

  await clearBrowserToken(page);
  await loginWithPage(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto(`/orders/${order.id}`);
  await expect(page.locator(".order-status--cancelled")).toBeVisible();
});

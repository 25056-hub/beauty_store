import { apiRequest } from "./client";

export function getOrders(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.skip !== undefined) {
    searchParams.set("skip", params.skip);
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", params.limit);
  }

  const query = searchParams.toString();

  return apiRequest(`/api/orders${query ? `?${query}` : ""}`);
}

export function getOrder(orderId) {
  return apiRequest(`/api/orders/${orderId}`);
}

export function getAdminOrders(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.skip !== undefined) {
    searchParams.set("skip", params.skip);
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", params.limit);
  }

  const query = searchParams.toString();

  return apiRequest(`/api/orders/admin/all${query ? `?${query}` : ""}`);
}

export function createOrder(shippingAddress) {
  return apiRequest("/api/orders/create", {
    method: "POST",
    body: JSON.stringify({
      shipping_address: shippingAddress,
    }),
  });
}

export function updateOrderStatus(orderId, status) {
  return apiRequest(`/api/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

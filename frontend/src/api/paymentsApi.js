import { apiRequest } from "./client";

export function submitPayment(orderId, bpayCode) {
  return apiRequest("/api/payments/submit", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      bpay_code: bpayCode,
    }),
  });
}

export function getPaymentStatus(orderId) {
  return apiRequest(`/api/payments/${orderId}`);
}

export function getPendingPayments(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.skip !== undefined) {
    searchParams.set("skip", params.skip);
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", params.limit);
  }

  const query = searchParams.toString();

  return apiRequest(`/api/payments/admin/pending${query ? `?${query}` : ""}`);
}

export function reviewPayment(paymentId, status, adminNote = "") {
  return apiRequest(`/api/payments/admin/${paymentId}/review`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      admin_note: adminNote || null,
    }),
  });
}

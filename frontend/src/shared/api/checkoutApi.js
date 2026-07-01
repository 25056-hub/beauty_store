import { apiRequest } from "./client";

export function createCheckout(shippingAddress, bpayCode) {
  return apiRequest("/api/checkout", {
    method: "POST",
    body: JSON.stringify({
      shipping_address: shippingAddress,
      bpay_code: bpayCode,
    }),
  });
}

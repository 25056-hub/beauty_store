import { apiRequest } from "./client";
import { clearGuestCart, getGuestCartItems, replaceGuestCartItems } from "../utils/guestCart";

export function getCart() {
  return apiRequest("/api/cart");
}

export function addToCart(productId, quantity = 1) {
  return apiRequest("/api/cart/add", {
    method: "POST",
    body: JSON.stringify({
      product_id: productId,
      quantity,
    }),
  });
}

export function updateCartItem(itemId, quantity) {
  return apiRequest(`/api/cart/update/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(itemId) {
  return apiRequest(`/api/cart/remove/${itemId}`, {
    method: "DELETE",
  });
}

export async function syncGuestCartToBackend() {
  const guestItems = getGuestCartItems();

  if (guestItems.length === 0) {
    return [];
  }

  const failedItems = [];

  for (const item of guestItems) {
    try {
      await addToCart(item.product.id, item.quantity);
    } catch {
      failedItems.push(item);
    }
  }

  if (failedItems.length > 0) {
    replaceGuestCartItems(failedItems);
  } else {
    clearGuestCart();
  }

  return failedItems;
}

const GUEST_CART_KEY = "beauty_store_guest_cart";

function readGuestCart() {
  try {
    const value = localStorage.getItem(GUEST_CART_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function getGuestCartItems() {
  return readGuestCart();
}

export function replaceGuestCartItems(items) {
  writeGuestCart(items);
}

export function getGuestCartCount() {
  return readGuestCart().reduce((total, item) => total + item.quantity, 0);
}

export function addGuestCartItem(product, quantity = 1) {
  const items = readGuestCart();
  const existingItem = items.find((item) => item.product.id === product.id);
  const nextQuantity = existingItem
    ? Math.min(product.stock, existingItem.quantity + quantity)
    : Math.min(product.stock, quantity);

  if (existingItem) {
    existingItem.quantity = nextQuantity;
  } else {
    items.push({
      id: `guest-${product.id}`,
      product_id: product.id,
      quantity: nextQuantity,
      product,
    });
  }

  writeGuestCart(items);
  return items;
}

export function updateGuestCartItem(productId, quantity) {
  const items = readGuestCart()
    .map((item) => (
      item.product.id === productId
        ? { ...item, quantity: Math.max(1, Math.min(item.product.stock, quantity)) }
        : item
    ));

  writeGuestCart(items);
  return items;
}

export function removeGuestCartItem(productId) {
  const items = readGuestCart().filter((item) => item.product.id !== productId);
  writeGuestCart(items);
  return items;
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

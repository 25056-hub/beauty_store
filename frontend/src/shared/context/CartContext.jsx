import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCart } from "../api/cartApi";
import { isAuthenticated } from "../api/client";
import { getGuestCartCount } from "../utils/guestCart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    if (!isAuthenticated()) {
      setCartCount(getGuestCartCount());
      return;
    }

    try {
      const cart = await getCart();
      const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
      setCartCount(totalItems);
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  const value = useMemo(() => ({
    cartCount,
    refreshCartCount,
  }), [cartCount, refreshCartCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}

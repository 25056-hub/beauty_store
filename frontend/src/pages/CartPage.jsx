import { Gift, LockKeyhole, Minus, PackageCheck, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCart, removeCartItem, updateCartItem } from "../api/cartApi";
import { isAuthenticated } from "../api/client";
import { useCart } from "../context/CartContext";
import { getGuestCartItems, removeGuestCartItem, updateGuestCartItem } from "../utils/guestCart";

const fallbackImages = [
  "/file_00000000024471f4824f92dd1a4e6d44.png",
  "/file_000000002fb071f4846f3e2aef16d40d.png",
  "/file_000000004c4871f491e266b7761a04f7.png",
  "/file_000000004e3c71f4b89cdba210b3c5b6.png",
  "/file_00000000a0c071f48d3ada2e41d3f6ad.png",
  "/file_00000000a48871f48d57f1e017fd30b2.png",
];

const cartBenefits = [
  {
    icon: Truck,
    title: "Fast Delivery",
    text: "Free shipping on all orders",
  },
  {
    icon: PackageCheck,
    title: "Online Shop",
    text: "Shop anytime anywhere",
  },
  {
    icon: ShieldCheck,
    title: "Great Value",
    text: "Premium quality at best prices",
  },
  {
    icon: Gift,
    title: "Top Discounts",
    text: "Exclusive offers every week",
  },
];

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

function getCartProductImage(item, index) {
  return item.product.image_url || fallbackImages[index % fallbackImages.length];
}

export default function CartPage() {
  const { refreshCartCount } = useCart();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState(null);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.product.price * item.quantity, 0),
    [items],
  );

  const shipping = 0;
  const total = subtotal + shipping;

  const loadCart = async () => {
    setError("");
    setIsLoading(true);

    if (!isAuthenticated()) {
      setItems(getGuestCartItems());
      setIsLoading(false);
      return;
    }

    try {
      const data = await getCart();
      setItems(data.items);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const updateQuantity = async (item, nextQuantity) => {
    const quantity = Math.max(1, nextQuantity);

    if (quantity === item.quantity) {
      return;
    }

    setError("");
    setUpdatingItemId(item.id);

    try {
      if (isAuthenticated()) {
        const updatedItem = await updateCartItem(item.id, quantity);
        setItems((currentItems) => (
          currentItems.map((cartItem) => (
            cartItem.id === item.id ? updatedItem : cartItem
          ))
        ));
      } else {
        setItems(updateGuestCartItem(item.product.id, quantity));
      }
      await refreshCartCount();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const removeItem = async (itemId) => {
    setError("");
    setUpdatingItemId(itemId);

    try {
      if (isAuthenticated()) {
        await removeCartItem(itemId);
        setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
      } else {
        const item = items.find((cartItem) => cartItem.id === itemId);
        if (item) {
          setItems(removeGuestCartItem(item.product.id));
        }
      }
      await refreshCartCount();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <main className="cart-page">
      <section className="site-container cart-header" aria-labelledby="cart-title">
        <h1 id="cart-title">Shopping Cart</h1>
        <span className="cart-title-mark" aria-hidden="true" />
      </section>

      {isLoading && (
        <section className="site-container shop-state" aria-live="polite">
          <p>Loading cart...</p>
        </section>
      )}

      {error && (
        <section className="site-container cart-feedback" role="alert">
          <p>{error}</p>
        </section>
      )}

      {!isLoading && items.length === 0 ? (
        <section className="site-container cart-empty">
          <h2>Your cart is empty</h2>
          <p>Explore the shop and add your favorite beauty products.</p>
          <Link to="/products">Go to Shop</Link>
        </section>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <section className="site-container cart-layout" aria-label="Cart items and summary">
          <div className="cart-items">
            {items.map((item, index) => {
              const isUpdating = updatingItemId === item.id;

              return (
                <article className="cart-item" key={item.id}>
                  <Link className="cart-item-image" to={`/products/${item.product.id}`} aria-label={`View ${item.product.name}`}>
                    <img src={getCartProductImage(item, index)} alt={item.product.name} />
                  </Link>
                  <div className="cart-item-info">
                    <h2>{item.product.name}</h2>
                    <span>Category {item.product.category_id}</span>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity-stepper cart-stepper" aria-label={`Quantity for ${item.product.name}`}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        disabled={isUpdating}
                      >
                        <Minus aria-hidden="true" size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                        aria-label="Increase quantity"
                        disabled={isUpdating}
                      >
                        <Plus aria-hidden="true" size={14} />
                      </button>
                    </div>
                  </div>
                  <strong>{formatCurrency(item.product.price * item.quantity)}</strong>
                  <button
                    className="cart-remove-button"
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.product.name}`}
                    disabled={isUpdating}
                  >
                    <Trash2 aria-hidden="true" size={17} />
                    <span>Remove</span>
                  </button>
                </article>
              );
            })}
          </div>

          <aside className="cart-summary" aria-label="Order summary">
            <h2>Order Summary</h2>
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatCurrency(subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>Free</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatCurrency(total)}</dd>
              </div>
            </dl>
            <Link className="cart-checkout-button" to="/checkout">
              <LockKeyhole aria-hidden="true" size={15} />
              Checkout
            </Link>
            <Link className="cart-continue-link" to="/products">Continue Shopping</Link>
          </aside>
        </section>
      ) : null}

      <section className="cart-benefits" aria-label="Shopping benefits">
        <div className="site-container cart-benefits-grid">
          {cartBenefits.map(({ icon: Icon, title, text }) => (
            <article className="cart-benefit" key={title}>
              <Icon aria-hidden="true" size={28} strokeWidth={1.8} />
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

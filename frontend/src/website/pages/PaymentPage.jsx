import {
  BadgeCheck,
  Check,
  Clock3,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Smartphone,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../shared/api/authApi";
import { getCart } from "../../shared/api/cartApi";
import { resolveAssetUrl } from "../../shared/api/client";
import { createCheckout } from "../../shared/api/checkoutApi";
import { useCart } from "../../shared/context/CartContext";
import { demoProductImages } from "../../shared/data/demoProducts";

const checkoutSteps = [
  { title: "Shopping Cart", status: "complete" },
  { title: "Checkout", status: "active" },
  { title: "Review", status: "next" },
  { title: "Confirmation", status: "next" },
];

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

function getCartProductImage(item, index) {
  return resolveAssetUrl(item.product.image_url || demoProductImages[index % demoProductImages.length]);
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();
  const [items, setItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.product.price * item.quantity, 0),
    [items],
  );

  const shipping = 0;
  const total = subtotal + shipping;

  useEffect(() => {
    let isMounted = true;

    async function loadCheckoutCart() {
      try {
        const [cartData, userData] = await Promise.all([
          getCart(),
          getCurrentUser(),
        ]);
        if (isMounted) {
          setItems(cartData.items);
          setProfile(userData);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCheckoutCart();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const address = formData.get("address");
    const city = formData.get("city");
    const phone = formData.get("phone");
    const bpayCode = formData.get("bpay_code");

    try {
      const checkout = await createCheckout(`${address}, ${city}. Bankily phone: ${phone}`, bpayCode);
      await refreshCartCount();
      navigate("/checkout/confirmation", {
        state: {
          order: checkout.order,
          payment: checkout.payment,
        },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="payment-page">
      <section className="site-container payment-header" aria-labelledby="payment-title">
        <h1 id="payment-title">Checkout</h1>
        <ol className="checkout-progress" aria-label="Checkout progress">
          {checkoutSteps.map((step, index) => (
            <li className={`checkout-progress-step checkout-progress-step--${step.status}`} key={step.title}>
              <span>{step.status === "complete" ? <Check aria-hidden="true" size={13} /> : index + 1}</span>
              <p>{step.title}</p>
            </li>
          ))}
        </ol>
      </section>

      {isLoading && (
        <section className="site-container shop-state" aria-live="polite">
          <p>Loading checkout...</p>
        </section>
      )}

      {!isLoading && items.length === 0 && (
        <section className="site-container cart-empty">
          <h2>Your cart is empty</h2>
          <p>Add products before checkout.</p>
        </section>
      )}

      {!isLoading && items.length > 0 && (
        <section className="site-container payment-layout" aria-label="Checkout and order summary">
          <form className="payment-card" aria-label="Checkout details" onSubmit={handleSubmit}>
            <div className="checkout-section">
              <div className="checkout-section-title">
                <span>1</span>
                <h2>Shipping Address</h2>
              </div>
              <div className="checkout-address-grid">
                <label>
                  <span>Full Name</span>
                  <input name="name" type="text" defaultValue={profile?.name || ""} required />
                </label>
                <label>
                  <span>Bankily Phone Number</span>
                  <input name="phone" type="tel" defaultValue={profile?.phone || ""} required />
                  <small>Use the same phone number you used to send the Bankily payment.</small>
                </label>
                <label>
                  <span>Address</span>
                  <input name="address" type="text" defaultValue={profile?.address || ""} required />
                </label>
                <label>
                  <span>City</span>
                  <select name="city" defaultValue="Nouakchott">
                    <option>Nouakchott</option>
                    <option>Nouadhibou</option>
                    <option>Rosso</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="checkout-section">
              <div className="checkout-section-title">
                <span>2</span>
                <h2>Payment Method</h2>
              </div>
              <div className="bankily-method">
                <span className="payment-method-icon" aria-hidden="true">
                  <Smartphone size={24} />
                </span>
                <div>
                  <h3>Bankily B-pay</h3>
                  <p>Send the total amount, then enter the 4-digit B-pay code.</p>
                </div>
                <BadgeCheck aria-hidden="true" size={20} />
              </div>
            </div>

            <div className="checkout-section">
              <div className="checkout-section-title">
                <span>3</span>
                <h2>Bankily Code</h2>
              </div>
              <div className="payment-total-box">
                <span>Total to pay</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <label className="payment-code-field">
                <span>B-pay code</span>
                <input
                  name="bpay_code"
                  type="text"
                  inputMode="numeric"
                  maxLength="4"
                  pattern="[0-9]{4}"
                  placeholder="0000"
                  aria-describedby="payment-code-help"
                  required
                />
              </label>
              <p id="payment-code-help" className="payment-helper">
                Use only 4 numbers. This code will be submitted in the next payment step.
              </p>
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="payment-submit-button" type="submit" disabled={isSubmitting}>
              <LockKeyhole aria-hidden="true" size={16} />
              {isSubmitting ? "Sending for Review..." : "Continue to Review"}
            </button>
          </form>

          <aside className="payment-summary" aria-label="Order summary">
            <div className="payment-summary-title">
              <h2>Order Summary</h2>
              <span>
                <BadgeCheck aria-hidden="true" size={16} />
                Ready for review
              </span>
            </div>

            <div className="payment-summary-items">
              {items.map((item, index) => (
                <article className="payment-summary-item" key={item.id}>
                  <img src={getCartProductImage(item, index)} alt={item.product.name} />
                  <div>
                    <h3>{item.product.name}</h3>
                    <p>Qty {item.quantity}</p>
                  </div>
                  <strong>{formatCurrency(item.product.price * item.quantity)}</strong>
                </article>
              ))}
            </div>

            <dl className="payment-summary-totals">
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

            <div className="checkout-trust-list">
              <p><Truck aria-hidden="true" size={16} /> Free shipping from Nouakchott</p>
              <p><PackageCheck aria-hidden="true" size={16} /> Safe beauty product packing</p>
              <p><Clock3 aria-hidden="true" size={16} /> Manual Bankily verification</p>
              <p><MapPin aria-hidden="true" size={16} /> Delivery inside Mauritania</p>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

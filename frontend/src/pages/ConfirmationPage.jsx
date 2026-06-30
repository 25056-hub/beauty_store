import { Check, Clock3, PackageCheck, ReceiptText, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getOrders } from "../api/ordersApi";
import { getPaymentStatus } from "../api/paymentsApi";

const confirmationSteps = [
  { title: "Shopping Cart", status: "complete" },
  { title: "Checkout", status: "complete" },
  { title: "Review", status: "active" },
  { title: "Confirmation", status: "next" },
];

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("en-US")} MRU`;

export default function ConfirmationPage() {
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [payment, setPayment] = useState(location.state?.payment || null);
  const [isLoading, setIsLoading] = useState(!location.state?.order);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location.state?.order) {
      return undefined;
    }

    let isMounted = true;

    async function loadLatestOrder() {
      try {
        const orders = await getOrders({ limit: 1 });
        const latestOrder = orders[0];

        if (!latestOrder) {
          throw new Error("No submitted order found.");
        }

        let latestPayment = null;

        try {
          latestPayment = await getPaymentStatus(latestOrder.id);
        } catch {
          latestPayment = null;
        }

        if (isMounted) {
          setOrder(latestOrder);
          setPayment(latestPayment);
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

    loadLatestOrder();

    return () => {
      isMounted = false;
    };
  }, [location.state]);

  const orderDetails = [
    ["Order Number", order ? `#BS-${order.id}` : "Created order"],
    ["Payment Method", payment?.method || "Bankily B-pay"],
    ["Payment Status", payment?.status || "Pending admin review"],
    ["Total", formatCurrency(order?.total_price || payment?.amount)],
  ];

  if (isLoading) {
    return (
      <main className="confirmation-page">
        <section className="site-container shop-state" aria-live="polite">
          <p>Loading confirmation...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="confirmation-page">
        <section className="site-container cart-empty">
          <h1>Confirmation not found</h1>
          <p>{error}</p>
          <Link to="/orders">View My Orders</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="confirmation-page">
      <section className="site-container payment-header" aria-labelledby="confirmation-title">
        <h1 id="confirmation-title">Order Submitted</h1>
        <ol className="checkout-progress" aria-label="Checkout progress">
          {confirmationSteps.map((step, index) => (
            <li className={`checkout-progress-step checkout-progress-step--${step.status}`} key={step.title}>
              <span>{step.status === "complete" ? <Check aria-hidden="true" size={13} /> : index + 1}</span>
              <p>{step.title}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="site-container confirmation-layout" aria-label="Order confirmation">
        <article className="confirmation-card">
          <span className="confirmation-status-icon" aria-hidden="true">
            <Clock3 size={34} />
          </span>
          <p className="home-eyebrow">Pending Review</p>
          <h2>Your order is waiting for admin approval</h2>
          <p>
            We received your Bankily B-pay code. The admin will verify the payment manually, then your order status will be updated.
          </p>
          <div className="confirmation-actions">
            <Link className="payment-submit-button" to="/orders">View My Orders</Link>
            <Link className="confirmation-secondary-link" to="/products">Continue Shopping</Link>
          </div>
        </article>

        <aside className="confirmation-summary" aria-label="Submitted order details">
          <h2>Order Details</h2>
          <dl>
            {orderDetails.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="confirmation-next-steps">
            <h3>Next Steps</h3>
            <p><ReceiptText aria-hidden="true" size={16} /> Admin checks the B-pay code.</p>
            <p><PackageCheck aria-hidden="true" size={16} /> Your order moves to processing after approval.</p>
            <p><ShoppingBag aria-hidden="true" size={16} /> You can follow the status from My Orders.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

import { ArrowLeft, Clock3, MapPin, PackageCheck, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrder } from "../../shared/api/ordersApi";

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function OrderDetailsPage() {
  const { orderSlug } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        const data = await getOrder(orderSlug);
        if (isMounted) {
          setOrder(data);
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

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderSlug]);

  if (isLoading) {
    return (
      <main className="orders-page">
        <section className="site-container shop-state" aria-live="polite">
          <p>Loading order...</p>
        </section>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="orders-page">
        <section className="site-container orders-shell order-details-empty">
          <h1>Order not found</h1>
          {error && <p>{error}</p>}
          <Link className="orders-view-link" to="/orders">Back to My Orders</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <section className="site-container orders-shell order-details-page" aria-labelledby="order-details-title">
        <Link className="payment-back-link" to="/orders">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to My Orders
        </Link>

        <div className="orders-header">
          <p className="home-eyebrow">Order Details</p>
          <h1 id="order-details-title">#BS-{order.id}</h1>
          <p>{formatDate(order.created_at)}</p>
        </div>

        <div className="order-details-grid">
          <article className="order-details-card">
            <div className="order-details-title-row">
              <h2>Products</h2>
              <span className={`order-status order-status--${order.status}`}>{order.status}</span>
            </div>

            <div className="order-products-list">
              {order.items.map((item) => (
                <div className="order-product-row" key={item.id}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <span>Qty {item.quantity}</span>
                  </div>
                  <p>{formatCurrency(item.unit_price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </article>

          <aside className="order-details-card order-details-summary">
            <h2>Summary</h2>
            <dl>
              <div>
                <dt>Total</dt>
                <dd>{formatCurrency(order.total_price)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{order.status}</dd>
              </div>
              <div>
                <dt>Delivery Address</dt>
                <dd>{order.shipping_address}</dd>
              </div>
            </dl>

            <div className="confirmation-next-steps">
              <h3>Status Timeline</h3>
              <p><ReceiptText aria-hidden="true" size={16} /> Order received</p>
              <p><Clock3 aria-hidden="true" size={16} /> Payment review in progress</p>
              <p><PackageCheck aria-hidden="true" size={16} /> Current status: {order.status}</p>
              <p><MapPin aria-hidden="true" size={16} /> Delivery: {order.shipping_address}</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

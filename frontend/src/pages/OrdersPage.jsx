import { Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getOrders } from "../api/ordersApi";

const orderTabs = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Canceled", value: "cancelled" },
];

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        const data = await getOrders({ limit: 50 });
        if (isMounted) {
          setOrders(data);
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

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleOrders = useMemo(() => (
    activeTab === "all" ? orders : orders.filter((order) => order.status === activeTab)
  ), [activeTab, orders]);

  return (
    <main className="orders-page">
      <section className="site-container orders-shell" aria-labelledby="orders-title">
        <div className="orders-header">
          <p className="home-eyebrow">Account</p>
          <h1 id="orders-title">My Orders</h1>
          <p>Track and manage your orders</p>
        </div>

        <nav className="orders-tabs" aria-label="Order filters">
          {orderTabs.map((tab) => (
            <button
              className={activeTab === tab.value ? "orders-tab orders-tab--active" : "orders-tab"}
              type="button"
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {isLoading && (
          <section className="shop-state" aria-live="polite">
            <p>Loading orders...</p>
          </section>
        )}

        {error && (
          <section className="cart-feedback" role="alert">
            <p>{error}</p>
          </section>
        )}

        {!isLoading && !error && (
          <div className="orders-table-card">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>#BS-{order.id}</strong>
                      <span>{order.items.length} items</span>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{formatCurrency(order.total_price)}</td>
                    <td>
                      <span className={`order-status order-status--${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <Link className="orders-view-link" to={`/orders/${order.id}`}>
                        <Eye aria-hidden="true" size={14} />
                        View Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleOrders.length === 0 && (
              <p className="orders-empty">No orders found in this status.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

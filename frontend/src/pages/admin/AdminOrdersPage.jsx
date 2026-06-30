import { useEffect, useMemo, useState } from "react";
import { Eye, PackageCheck, Search } from "lucide-react";
import { getAdminOrders, updateOrderStatus } from "../../api/ordersApi";
import AdminSidebar from "../../components/layout/AdminSidebar";

const orderStatusTransitions = {
  pending: ["cancelled"],
  paid: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-US")} MRU`;
}

function formatOrderId(id) {
  return `#BS-${String(id).padStart(4, "0")}`;
}

function formatStatus(status) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
}

function getPaymentLabel(status) {
  if (["paid", "shipped", "delivered"].includes(status)) {
    return "Approved";
  }
  if (status === "cancelled") {
    return "Rejected";
  }
  return "Pending";
}

function getAllowedStatusOptions(status) {
  return [status, ...(orderStatusTransitions[status] || [])];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      try {
        const data = await getAdminOrders({ limit: 100 });
        if (isActive) {
          setOrders(data);
          setError("");
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError.message);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return orders;
    }

    return orders.filter((order) => {
      const orderId = formatOrderId(order.id).toLowerCase();
      const customer = order.user?.name?.toLowerCase() || "";
      const email = order.user?.email?.toLowerCase() || "";
      return orderId.includes(normalizedSearch)
        || customer.includes(normalizedSearch)
        || email.includes(normalizedSearch);
    });
  }, [orders, search]);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    setError("");

    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      setOrders((currentOrders) => currentOrders.map((order) => (
        order.id === orderId
          ? { ...order, status: updatedOrder.status }
          : order
      )));
      setSelectedOrder((currentOrder) => (
        currentOrder?.id === orderId
          ? { ...currentOrder, status: updatedOrder.status }
          : currentOrder
      ));
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <main className="admin-shell">
      <AdminSidebar />
      <section className="admin-main" aria-labelledby="admin-orders-title">
        <header className="admin-topbar">
          <div>
            <p>Customer fulfillment</p>
            <h1 id="admin-orders-title">Orders</h1>
          </div>
          <label className="admin-search">
            <Search aria-hidden="true" size={17} />
            <input
              type="search"
              placeholder="Search order"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </header>

        <article className="admin-panel admin-table-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Order Management</h2>
              <p>Follow payment and delivery status.</p>
            </div>
            <PackageCheck aria-hidden="true" size={18} />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <table className="admin-table admin-wide-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6">Loading orders...</td>
                </tr>
              )}
              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="6">No orders found.</td>
                </tr>
              )}
              {!isLoading && filteredOrders.map((order) => {
                const paymentLabel = getPaymentLabel(order.status);
                const statusOptions = getAllowedStatusOptions(order.status);
                return (
                <tr key={order.id}>
                  <td>{formatOrderId(order.id)}</td>
                  <td>{order.user?.name || "Customer"}</td>
                  <td>{formatCurrency(order.total_price)}</td>
                  <td><span className={`admin-pill admin-pill--${paymentLabel.toLowerCase()}`}>{paymentLabel}</span></td>
                  <td><span className={`admin-pill admin-pill--${order.status}`}>{formatStatus(order.status)}</span></td>
                  <td>
                    <div className="admin-row-actions">
                      <select
                        className="admin-status-select"
                        value={order.status}
                        disabled={updatingOrderId === order.id || statusOptions.length === 1}
                        onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option value={status} key={status}>{formatStatus(status)}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setSelectedOrder(order)}>
                        <Eye aria-hidden="true" size={14} /> View
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        {selectedOrder && (
          <article className="admin-panel admin-table-panel">
            <div className="admin-panel-header">
              <div>
                <h2>{formatOrderId(selectedOrder.id)}</h2>
                <p>{selectedOrder.user?.email || "Customer order details"}</p>
              </div>
              <PackageCheck aria-hidden="true" size={18} />
            </div>
            <div className="admin-order-summary">
              <span>Customer: <strong>{selectedOrder.user?.name || "Customer"}</strong></span>
              <span>Total: <strong>{formatCurrency(selectedOrder.total_price)}</strong></span>
              <span>Status: <strong>{formatStatus(selectedOrder.status)}</strong></span>
              <span>Address: <strong>{selectedOrder.shipping_address}</strong></span>
            </div>
            <table className="admin-table admin-wide-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.name || "Product"}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        )}
      </section>
    </main>
  );
}

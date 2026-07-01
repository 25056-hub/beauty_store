import { useMemo, useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  Download,
  Eye,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAdminDashboard } from "../api/adminApi";
import AdminNavbar from "../components/AdminNavbar";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-US")} MRU`;
}

function formatCompactCurrency(value) {
  const amount = Number(value || 0);

  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M MRU`;
  }

  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}K MRU`;
  }

  return `${amount.toLocaleString("en-US")} MRU`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatOrderId(id) {
  return `#BS-${String(id).padStart(4, "0")}`;
}

function formatStatus(status) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
}

function formatDashboardDate(value) {
  if (!value) {
    return "25 Dec 2025";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("last7");

  async function loadDashboard() {
    try {
      const data = await getAdminDashboard();
      setDashboard(data);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const values = dashboard?.stats || {};

    return [
      { label: "Total Sales", value: Number(values.orders || 0).toLocaleString("en-US"), change: "+3.1% vs Last Week", icon: TrendingUp, tone: "up" },
      { label: "Total Revenue", value: formatCompactCurrency(values.revenue), change: "+2.4% vs Last Week", icon: CreditCard, tone: "up" },
      { label: "Active Customers", value: Number(values.customers || 0).toLocaleString("en-US"), change: "+4.2% vs Last Week", icon: UsersRound, tone: "up" },
      { label: "Refund Request", value: Number(values.cancelled_orders || 0).toLocaleString("en-US"), change: "-0.6% vs Last Week", icon: ShoppingBag, tone: "down" },
    ];
  }, [dashboard]);

  const weeklySales = dashboard?.weekly_sales || [];
  const weeklyMax = Math.max(...weeklySales.map((day) => Number(day.total || 0)), 1);
  const salesOverview = dashboard?.sales_overview || {};
  const successRate = Number(dashboard?.success_rate || 0);
  const activeGaugeTicks = Math.max(0, Math.min(26, Math.round((successRate / 100) * 26)));
  const hasSalesOverview = ["successful", "pending", "cancelled"].some(
    (key) => Number(salesOverview[key] || 0) > 0,
  );
  const successfulBars = hasSalesOverview ? Math.round((Number(salesOverview.successful || 0) / 100) * 40) : 0;
  const pendingBars = hasSalesOverview ? Math.round((Number(salesOverview.pending || 0) / 100) * 40) : 0;
  const cancelledBars = hasSalesOverview ? Math.max(0, 40 - successfulBars - pendingBars) : 0;
  const dateRangeLabels = {
    last7: "Last 7 days",
    last14: "Last 14 days",
    last30: "Last 30 days",
  };

  function exportDashboardReport() {
    const rows = [
      ["Metric", "Value"],
      ["Revenue", dashboard?.stats?.revenue || 0],
      ["Orders", dashboard?.stats?.orders || 0],
      ["Customers", dashboard?.stats?.customers || 0],
      ["Success Rate", `${dashboard?.success_rate || 0}%`],
      [],
      ["Recent Orders"],
      ["Order ID", "Customer", "Total", "Status", "Date"],
      ...(dashboard?.recent_orders || []).map((order) => [
        formatOrderId(order.id),
        order.customer,
        order.total_price,
        order.status,
        formatDashboardDate(order.created_at),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "beauty-store-dashboard-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="admin-shell">
      <AdminNavbar />
      <section className="admin-main" aria-labelledby="admin-title">
        <header className="admin-topbar admin-dashboard-hero">
          <div>
            <p>Welcome, Jon Snow</p>
            <span>Manage products, orders, customers, and performance in one place.</span>
          </div>
          <div className="admin-topbar-actions">
            <label className="admin-filter-select">
              <CalendarDays aria-hidden="true" size={16} />
              <span className="sr-only">Dashboard date range</span>
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
                <option value="last7">{dateRangeLabels.last7}</option>
                <option value="last14">{dateRangeLabels.last14}</option>
                <option value="last30">{dateRangeLabels.last30}</option>
              </select>
              <ChevronDown aria-hidden="true" size={14} />
            </label>
            <button className="admin-filter-button" type="button" onClick={exportDashboardReport} disabled={isLoading || !dashboard}>
              <Download aria-hidden="true" size={16} />
              Export Report
            </button>
          </div>
        </header>

        {error && <p className="auth-error">{error}</p>}

        <section className="admin-overview-grid" aria-label="Dashboard overview">
          <div className="admin-mini-stats">
            {stats.map(({ label, value, change, icon: Icon, tone }) => (
              <article className="admin-stat-card" key={label}>
                <span className="admin-stat-icon"><Icon aria-hidden="true" size={16} /></span>
                <div>
                  <p>{label}</p>
                  <strong>{isLoading ? "..." : value}</strong>
                  <small className={`admin-change admin-change--${tone}`}>{change}</small>
                </div>
              </article>
            ))}
          </div>

          <article className="admin-panel admin-profit-card">
            <div className="admin-panel-header">
              <div>
                <h2>Total Profit</h2>
                <strong>{isLoading ? "..." : formatCompactCurrency(dashboard?.stats?.profit)}</strong>
              </div>
              <span>{dateRangeLabels[dateRange]}</span>
            </div>
            <div className="admin-profit-chart" aria-label="Total profit chart">
              {(weeklySales.length ? weeklySales : [
                { label: "Sun", total: 0 },
                { label: "Mon", total: 0 },
                { label: "Tue", total: 0 },
                { label: "Wed", total: 0 },
                { label: "Thu", total: 0 },
                { label: "Fri", total: 0 },
                { label: "Sat", total: 0 },
              ]).map((day, index) => (
                <span
                  className={Number(day.total || 0) === weeklyMax ? "is-active" : ""}
                  style={{ "--height": `${Math.max(20, Math.round((Number(day.total || 0) / weeklyMax) * 78))}%` }}
                  key={`${day.label}-${index}`}
                  title={`${day.label}: ${formatCurrency(day.total)}`}
                >
                  <i />
                </span>
              ))}
            </div>
            <div className="admin-chart-days" aria-hidden="true">
              {(weeklySales.length ? weeklySales : [
                { label: "Sun" },
                { label: "Mon" },
                { label: "Tue" },
                { label: "Wed" },
                { label: "Thu" },
                { label: "Fri" },
                { label: "Sat" },
              ]).map((day) => <span key={day.label}>{day.label}</span>)}
            </div>
          </article>

          <article className="admin-panel admin-success-card">
            <div className="admin-panel-header">
              <div>
                <h2>Success Rate</h2>
              </div>
              <span>{dateRangeLabels[dateRange]}</span>
            </div>
            <div className="admin-success-gauge" aria-label={`Success rate ${formatPercent(successRate)}`}>
              <svg viewBox="0 0 200 118" aria-hidden="true">
                {Array.from({ length: 26 }, (_, index) => {
                  const angle = (198 + index * 5.75) * (Math.PI / 180);
                  const active = index < activeGaugeTicks;

                  return (
                    <line
                      className={active ? "is-active" : ""}
                      key={index}
                      x1={100 + Math.cos(angle) * 56}
                      y1={104 + Math.sin(angle) * 56}
                      x2={100 + Math.cos(angle) * 78}
                      y2={104 + Math.sin(angle) * 78}
                    />
                  );
                })}
              </svg>
              <strong>{isLoading ? "..." : formatPercent(successRate)}</strong>
              <small>Sales Growth</small>
            </div>
            <div className="admin-success-details">
              <div>
                <span>Sales Number</span>
                <strong>{Number(dashboard?.stats?.successful_orders || 0).toLocaleString("en-US")}</strong>
              </div>
              <div>
                <span>Total Revenue</span>
                <strong>{formatCompactCurrency(dashboard?.stats?.revenue)}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="admin-final-grid">
          <article className="admin-panel admin-recent-orders-card">
            <div className="admin-panel-header admin-orders-header">
              <div>
                <h2>Recent Orders</h2>
                <p>Track the latest customer orders</p>
              </div>
              <div className="admin-orders-tools">
                <label>
                  <span className="sr-only">Search orders</span>
                  <input type="search" placeholder="Search" />
                </label>
                <button type="button">
                  Status
                  <SlidersHorizontal aria-hidden="true" size={14} />
                </button>
              </div>
            </div>
            <table className="admin-table admin-orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Products</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan="7">Loading orders...</td>
                  </tr>
                )}
                {!isLoading && dashboard?.recent_orders?.length === 0 && (
                  <tr>
                    <td colSpan="7">No recent orders.</td>
                  </tr>
                )}
                {!isLoading && dashboard?.recent_orders?.map((order, index) => (
                  <tr key={order.id}>
                    <td>{formatOrderId(order.id)}</td>
                    <td>
                      <div className="admin-product-cell">
                        <span aria-hidden="true">{index + 1}</span>
                        <div>
                          <strong>{order.product_name || "Beauty Product"}</strong>
                          <small>{order.items_count || "1"} item order</small>
                        </div>
                      </div>
                    </td>
                    <td>{order.customer}</td>
                    <td>{formatDashboardDate(order.created_at)}</td>
                    <td>{formatCurrency(order.total_price)}</td>
                    <td><span className={`admin-pill admin-pill--${order.status}`}>{formatStatus(order.status)}</span></td>
                    <td>
                      <button
                        className="admin-view-button"
                        type="button"
                        onClick={() => navigate(`/admin/orders?order=${order.id}`)}
                        aria-label={`View order ${order.id}`}
                      >
                        <Eye aria-hidden="true" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="admin-panel admin-sales-overview-card">
            <div className="admin-panel-header">
              <div>
                <h2>Sales Overview</h2>
              </div>
              <span>{dateRangeLabels[dateRange]}</span>
            </div>

            <div className="admin-sales-status">
              <div>
                <span><i className="admin-sales-dot admin-sales-dot--success" /> Successful Sales</span>
                <strong>{formatPercent(salesOverview.successful)}</strong>
              </div>
              <div>
                <span><i className="admin-sales-dot admin-sales-dot--pending" /> Pending</span>
                <strong>{formatPercent(salesOverview.pending)}</strong>
              </div>
              <div>
                <span><i className="admin-sales-dot admin-sales-dot--cancelled" /> Cancelled</span>
                <strong>{formatPercent(salesOverview.cancelled)}</strong>
              </div>
            </div>

            <div className="admin-sales-bars" aria-label="Sales status distribution">
              {Array.from({ length: successfulBars }, (_, index) => <span className="is-success" key={`success-${index}`} />)}
              {Array.from({ length: pendingBars }, (_, index) => <span className="is-pending" key={`pending-${index}`} />)}
              {Array.from({ length: cancelledBars }, (_, index) => <span className="is-cancelled" key={`cancelled-${index}`} />)}
            </div>

            <table className="admin-table admin-sales-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Percent</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && dashboard?.top_products?.length === 0 && (
                  <tr>
                    <td colSpan="3">No product sales yet.</td>
                  </tr>
                )}
                {!isLoading && dashboard?.top_products?.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{formatPercent(product.percent)}</td>
                    <td>{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      </section>
    </main>
  );
}

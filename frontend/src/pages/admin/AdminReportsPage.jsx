import { useEffect, useMemo, useState } from "react";
import { ChartNoAxesCombined, CreditCard, PackageCheck, TrendingUp } from "lucide-react";
import { getAdminReports } from "../../api/adminApi";
import AdminSidebar from "../../components/layout/AdminSidebar";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-US")} MRU`;
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString("en-US")}%`;
}

function formatLabel(value) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildBars(statusCounts) {
  const entries = Object.entries(statusCounts || {});
  const maxValue = Math.max(...entries.map(([, count]) => count), 1);

  return entries.map(([status, count]) => ({
    status,
    count,
    height: `${Math.max(18, Math.round((count / maxValue) * 86))}%`,
  }));
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadReports() {
      try {
        const data = await getAdminReports();
        if (isActive) {
          setReports(data);
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

    loadReports();

    return () => {
      isActive = false;
    };
  }, []);

  const reportCards = useMemo(() => {
    const summary = reports?.summary || {};

    return [
      { title: "Total Revenue", value: formatCurrency(summary.revenue), note: "Approved payments", icon: TrendingUp },
      { title: "Approval Rate", value: formatPercent(summary.approval_rate), note: "Payment success", icon: CreditCard },
      { title: "Delivered Orders", value: summary.delivered_orders || 0, note: `${summary.orders || 0} total orders`, icon: PackageCheck },
    ];
  }, [reports]);

  const orderBars = useMemo(() => buildBars(reports?.order_status_counts), [reports]);
  const paymentStatuses = Object.entries(reports?.payment_status_counts || {});

  return (
    <main className="admin-shell">
      <AdminSidebar />
      <section className="admin-main" aria-labelledby="admin-reports-title">
        <header className="admin-topbar">
          <div>
            <p>Store analytics</p>
            <h1 id="admin-reports-title">Reports</h1>
          </div>
        </header>

        {error && <p className="auth-error">{error}</p>}

        <section className="admin-stats-grid">
          {reportCards.map(({ title, value, note, icon: Icon }) => (
            <article className="admin-stat-card" key={title}>
              <span className="admin-stat-icon"><Icon aria-hidden="true" size={20} /></span>
              <div>
                <p>{title}</p>
                <strong>{isLoading ? "..." : value}</strong>
                <small>{note}</small>
              </div>
            </article>
          ))}
        </section>

        <section className="admin-dashboard-grid">
          <article className="admin-panel admin-sales-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Order Status</h2>
                <p>Live distribution by fulfillment state.</p>
              </div>
              <ChartNoAxesCombined aria-hidden="true" size={18} />
            </div>
            <div className="admin-line-chart admin-line-chart--wide" aria-label="Order status chart">
              {isLoading && <span style={{ "--height": "34%" }} />}
              {!isLoading && orderBars.map((bar) => (
                <span
                  style={{ "--height": bar.height }}
                  title={`${formatLabel(bar.status)}: ${bar.count}`}
                  key={bar.status}
                />
              ))}
            </div>
            <div className="admin-report-legend">
              {orderBars.map((bar) => (
                <p key={bar.status}>
                  <strong>{bar.count}</strong>
                  {formatLabel(bar.status)}
                </p>
              ))}
            </div>
          </article>

          <article className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Payment Status</h2>
                <p>Bankily B-pay review summary.</p>
              </div>
              <CreditCard aria-hidden="true" size={18} />
            </div>
            <div className="admin-report-status-list">
              {isLoading && <p>Loading payment report...</p>}
              {!isLoading && paymentStatuses.map(([status, count]) => (
                <p key={status}>
                  <span className={`admin-pill admin-pill--${status}`}>{formatLabel(status)}</span>
                  <strong>{count}</strong>
                </p>
              ))}
            </div>
          </article>

          <article className="admin-panel admin-table-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Top Products</h2>
                <p>Products ranked by units sold.</p>
              </div>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan="3">Loading products...</td>
                  </tr>
                )}
                {!isLoading && reports?.top_products?.length === 0 && (
                  <tr>
                    <td colSpan="3">No sales yet.</td>
                  </tr>
                )}
                {!isLoading && reports?.top_products?.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.units_sold}</td>
                    <td>{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="admin-panel admin-table-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Low Stock</h2>
                <p>Products that need attention first.</p>
              </div>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan="3">Loading stock...</td>
                  </tr>
                )}
                {!isLoading && reports?.low_stock_products?.length === 0 && (
                  <tr>
                    <td colSpan="3">No products found.</td>
                  </tr>
                )}
                {!isLoading && reports?.low_stock_products?.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.stock}</td>
                    <td>{formatCurrency(product.price)}</td>
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

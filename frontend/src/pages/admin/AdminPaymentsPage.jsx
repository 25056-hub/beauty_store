import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getPendingPayments, reviewPayment } from "../../api/paymentsApi";
import AdminSidebar from "../../components/layout/AdminSidebar";

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

function formatStatus(status) {
  if (status === "under_review") {
    return "Pending";
  }

  if (status === "success") {
    return "Approved";
  }

  return status;
}

function getStatusClass(status) {
  if (status === "under_review") {
    return "pending";
  }

  if (status === "success") {
    return "approved";
  }

  return status;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      try {
        const data = await getPendingPayments({ limit: 50 });
        if (isMounted) {
          setPayments(data);
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

    loadPayments();

    return () => {
      isMounted = false;
    };
  }, []);

  const visiblePayments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return payments;
    }

    return payments.filter((payment) => (
      String(payment.order_id).includes(query)
      || payment.bpay_code.includes(query)
      || payment.method.toLowerCase().includes(query)
    ));
  }, [payments, searchTerm]);

  const handleReview = async (paymentId, nextStatus) => {
    setError("");
    setReviewingId(paymentId);

    try {
      await reviewPayment(paymentId, nextStatus);
      setPayments((currentPayments) => (
        currentPayments.filter((payment) => payment.id !== paymentId)
      ));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <main className="admin-shell">
      <AdminSidebar />
      <section className="admin-main" aria-labelledby="payments-title">
        <header className="admin-topbar">
          <div>
            <p>Bankily manual review</p>
            <h1 id="payments-title">Payments</h1>
          </div>
          <label className="admin-search">
            <Search aria-hidden="true" size={17} />
            <input
              type="search"
              placeholder="Search payment"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </header>

        {isLoading && (
          <section className="admin-panel admin-empty-panel" aria-live="polite">
            <p>Loading pending payments...</p>
          </section>
        )}

        {error && (
          <section className="admin-panel admin-error-panel" role="alert">
            <p>{error}</p>
          </section>
        )}

        {!isLoading && (
          <article className="admin-panel admin-table-panel">
            <div className="admin-panel-header">
              <div>
                <h2>B-pay Requests</h2>
                <p>Approve only after checking the Bankily code manually.</p>
              </div>
            </div>

            <table className="admin-table admin-payments-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Method</th>
                  <th>B-pay Code</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visiblePayments.map((payment) => {
                  const isReviewing = reviewingId === payment.id;

                  return (
                    <tr key={payment.id}>
                      <td>#BS-{payment.order_id}</td>
                      <td>{payment.method}</td>
                      <td><code>{payment.bpay_code}</code></td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className={`admin-pill admin-pill--${getStatusClass(payment.status)}`}>
                          {formatStatus(payment.status)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" onClick={() => handleReview(payment.id, "success")} disabled={isReviewing}>
                            <Check aria-hidden="true" size={14} />
                            Approve
                          </button>
                          <button type="button" onClick={() => handleReview(payment.id, "rejected")} disabled={isReviewing}>
                            <X aria-hidden="true" size={14} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visiblePayments.length === 0 && (
              <p className="orders-empty">No pending payments found.</p>
            )}
          </article>
        )}
      </section>
    </main>
  );
}

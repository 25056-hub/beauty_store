import { useEffect, useMemo, useState } from "react";
import { Mail, Search, UserRound } from "lucide-react";
import { getAdminUsers, updateAdminUserRole } from "../../api/authApi";
import AdminSidebar from "../../components/layout/AdminSidebar";

export default function AdminUsersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadCustomers() {
      try {
        const data = await getAdminUsers();
        if (isActive) {
          setCustomers(data);
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

    loadCustomers();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return customers;
    }

    return customers.filter((customer) => (
      customer.name.toLowerCase().includes(normalizedSearch)
      || customer.email.toLowerCase().includes(normalizedSearch)
      || customer.role.toLowerCase().includes(normalizedSearch)
    ));
  }, [customers, search]);

  const handleRoleChange = async (userId, role) => {
    setUpdatingUserId(userId);
    setError("");

    try {
      const updatedUser = await updateAdminUserRole(userId, role);
      setCustomers((currentCustomers) => currentCustomers.map((customer) => (
        customer.id === updatedUser.id ? updatedUser : customer
      )));
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <main className="admin-shell">
      <AdminSidebar />
      <section className="admin-main" aria-labelledby="admin-users-title">
        <header className="admin-topbar">
          <div>
            <p>Customer records</p>
            <h1 id="admin-users-title">Customers</h1>
          </div>
          <label className="admin-search">
            <Search aria-hidden="true" size={17} />
            <input
              type="search"
              placeholder="Search customer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </header>

        {error && <p className="auth-error">{error}</p>}

        <section className="admin-customer-grid">
          {isLoading && <article className="admin-panel admin-customer-card">Loading customers...</article>}
          {!isLoading && filteredCustomers.length === 0 && (
            <article className="admin-panel admin-customer-card">No customers found.</article>
          )}
          {!isLoading && filteredCustomers.map((customer) => (
            <article className="admin-panel admin-customer-card" key={customer.email}>
              <span className="admin-customer-avatar" aria-hidden="true">
                <UserRound size={22} />
              </span>
              <div>
                <h2>{customer.name}</h2>
                <p><Mail aria-hidden="true" size={14} /> {customer.email}</p>
                <p>{customer.phone || "No phone saved"}</p>
                <select
                  className="admin-status-select"
                  value={customer.role}
                  disabled={updatingUserId === customer.id}
                  onChange={(event) => handleRoleChange(customer.id, event.target.value)}
                  aria-label={`Change role for ${customer.name}`}
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <strong>{customer.orders_count} orders</strong>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

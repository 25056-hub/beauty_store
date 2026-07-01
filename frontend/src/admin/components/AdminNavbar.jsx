import {
  Boxes,
  Bell,
  ChevronDown,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  PackageCheck,
  UsersRound,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../shared/api/authApi";
import { useCart } from "../../shared/context/CartContext";

const adminLinks = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Products", to: "/admin/products", icon: Boxes },
  { label: "Orders", to: "/admin/orders", icon: PackageCheck },
  { label: "Payments", to: "/admin/payments", icon: CreditCard },
  { label: "Customers", to: "/admin/users", icon: UsersRound },
  { label: "Attributes", to: "/admin/categories", icon: FolderTree },
];

export default function AdminNavbar() {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  const handleLogout = async () => {
    await logout();
    await refreshCartCount();
    navigate("/login");
  };

  return (
    <header className="admin-sidebar" aria-label="Admin navigation">
      <NavLink className="admin-brand" to="/admin">
        <img src="/logo.png" alt="Beauty Store" />
      </NavLink>

      <nav className="admin-nav">
        {adminLinks.map(({ label, to, icon: Icon }) => (
          <NavLink className="admin-nav-link" end={to === "/admin"} to={to} key={label}>
            <Icon aria-hidden="true" size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="admin-navbar-actions">
        <button className="admin-icon-button" type="button" aria-label="Notifications">
          <Bell aria-hidden="true" size={18} />
        </button>
        <button className="admin-sidebar-user" type="button" onClick={handleLogout} aria-label="Admin profile and logout">
          <span>BA</span>
          <div>
            <strong>Jon snow</strong>
            <small>Super Admin</small>
          </div>
          <ChevronDown aria-hidden="true" size={15} />
        </button>
      </div>
    </header>
  );
}

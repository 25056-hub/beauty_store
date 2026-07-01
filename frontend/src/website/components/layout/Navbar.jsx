import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { getCurrentUser } from "../../../shared/api/authApi";
import { isAuthenticated } from "../../../shared/api/client";
import { useCart } from "../../../shared/context/CartContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { cartCount } = useCart();

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      if (!isAuthenticated()) {
        setIsAdmin(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (isMounted) {
          setIsAdmin(currentUser.role === "admin");
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  return (
    <header className="site-header site-header--overlay">
      <div className="site-container navbar">
        <Link className="navbar-brand" to="/" onClick={closeMenu}>
          <span className="navbar-logo-mark" aria-hidden="true" />
          <span className="navbar-wordmark">Beauty Store</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/products">Shop</NavLink>
          <NavLink to="/orders">My Orders</NavLink>
          {isAdmin && <NavLink to="/admin">Dashboard</NavLink>}
          <Link to="/#about">About</Link>
        </nav>

        <div className="navbar-actions">
          <Link className="icon-button" to="/account" aria-label="Account" title="Account">
            <UserRound aria-hidden="true" size={21} strokeWidth={1.7} />
          </Link>
          <Link className="icon-button cart-button" to="/cart" aria-label={`Shopping cart: ${cartCount} items`} title="Shopping cart">
            <ShoppingBag aria-hidden="true" size={23} strokeWidth={1.7} />
            <span className="cart-count" aria-hidden="true">{cartCount}</span>
          </Link>
          <button
            className="icon-button mobile-menu-button"
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X aria-hidden="true" size={23} /> : <Menu aria-hidden="true" size={23} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <NavLink to="/" onClick={closeMenu}>Home</NavLink>
          <NavLink to="/products" onClick={closeMenu}>Shop</NavLink>
          <NavLink to="/orders" onClick={closeMenu}>My Orders</NavLink>
          {isAdmin && <NavLink to="/admin" onClick={closeMenu}>Dashboard</NavLink>}
          <Link to="/#about" onClick={closeMenu}>About</Link>
          <Link to="/account" onClick={closeMenu}>Account</Link>
        </nav>
      )}
    </header>
  );
}

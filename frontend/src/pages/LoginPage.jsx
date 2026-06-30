import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { syncGuestCartToBackend } from "../api/cartApi";
import { login } from "../api/authApi";
import { useCart } from "../context/CartContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshCartCount } = useCart();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await login({
        email: formData.get("email"),
        password: formData.get("password"),
      });
      await syncGuestCartToBackend();
      await refreshCartCount();
      const redirectTo = location.state?.from
        ? `${location.state.from.pathname}${location.state.from.search}${location.state.from.hash}`
        : "/account";
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="site-container auth-layout" aria-labelledby="login-title">
        <div className="auth-brand-panel">
          <span className="auth-logo-mark" aria-hidden="true" />
          <p className="home-eyebrow">Beauty Store</p>
          <h1 id="login-title">Welcome Back</h1>
          <p>Sign in to track your orders, continue checkout, and manage your beauty purchases.</p>
          <div className="auth-note">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>Secure customer access for orders and Bankily payment review.</span>
          </div>
        </div>

        <form className="auth-card" aria-label="Login form" onSubmit={handleSubmit}>
          <div className="auth-card-header">
            <h2>Login</h2>
            <p>Enter your account details</p>
          </div>

          <label className="auth-field">
            <span>Email</span>
            <div>
              <Mail aria-hidden="true" size={18} />
              <input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div>
              <LockKeyhole aria-hidden="true" size={18} />
              <input name="password" type="password" placeholder="Your password" autoComplete="current-password" required />
            </div>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-row">
            <label className="auth-checkbox">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <Link to="/login">Forgot password?</Link>
          </div>

          <button className="auth-submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Sign In"}
            <ArrowRight aria-hidden="true" size={17} />
          </button>

          <p className="auth-switch">
            New customer? <Link to="/register" state={location.state}>Create account</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

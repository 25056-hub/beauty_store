import { ArrowRight, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { register } from "../api/authApi";
import { syncGuestCartToBackend } from "../api/cartApi";
import { useCart } from "../context/CartContext";

export default function RegisterPage() {
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
      await register({
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
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
      <section className="site-container auth-layout auth-layout--register" aria-labelledby="register-title">
        <div className="auth-brand-panel">
          <span className="auth-logo-mark" aria-hidden="true" />
          <p className="home-eyebrow">Beauty Store</p>
          <h1 id="register-title">Create Account</h1>
          <p>Join Beauty Store to save your details, follow orders, and checkout faster next time.</p>
          <div className="auth-note">
            <UserRound aria-hidden="true" size={20} />
            <span>Your account will be used for cart, checkout, and My Orders.</span>
          </div>
        </div>

        <form className="auth-card" aria-label="Register form" onSubmit={handleSubmit}>
          <div className="auth-card-header">
            <h2>Register</h2>
            <p>Start with your customer details</p>
          </div>

          <label className="auth-field">
            <span>Full Name</span>
            <div>
              <UserRound aria-hidden="true" size={18} />
              <input name="name" type="text" placeholder="Your name" autoComplete="name" required />
            </div>
          </label>

          <label className="auth-field">
            <span>Email</span>
            <div>
              <Mail aria-hidden="true" size={18} />
              <input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </div>
          </label>

          <label className="auth-field">
            <span>Phone</span>
            <div>
              <Phone aria-hidden="true" size={18} />
              <input name="phone" type="tel" placeholder="45223344" autoComplete="tel" required />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div>
              <LockKeyhole aria-hidden="true" size={18} />
              <input name="password" type="password" placeholder="Create password" autoComplete="new-password" required />
            </div>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Account"}
            <ArrowRight aria-hidden="true" size={17} />
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login" state={location.state}>Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

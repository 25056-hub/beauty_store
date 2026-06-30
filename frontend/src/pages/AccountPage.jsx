import { useEffect, useState } from "react";
import { KeyRound, LogOut, Mail, MapPin, PackageCheck, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout, updateCurrentUser, updatePassword } from "../api/authApi";
import { useCart } from "../context/CartContext";

function formatDate(date) {
  if (!date) {
    return "New";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatRole(role) {
  return role === "admin" ? "Admin" : "Customer";
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadAccount() {
      try {
        const currentUser = await getCurrentUser();
        if (isActive) {
          setUser(currentUser);
          setFormData({
            name: currentUser.name || "",
            phone: currentUser.phone || "",
            address: currentUser.address || "",
          });
          setError("");
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError.message);
        }
        await logout();
        await refreshCartCount();
        navigate("/login");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      isActive = false;
    };
  }, [navigate, refreshCartCount]);

  const accountStats = user
    ? [
        { label: "Role", value: formatRole(user.role) },
        { label: "Member Since", value: formatDate(user.created_at) },
        { label: "Account", value: "Active" },
      ]
    : [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
    setSaveMessage("");
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const updatedUser = await updateCurrentUser({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      });

      setUser(updatedUser);
      setFormData({
        name: updatedUser.name || "",
        phone: updatedUser.phone || "",
        address: updatedUser.address || "",
      });
      setSaveMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
    setPasswordError("");
    setPasswordMessage("");
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setIsPasswordSaving(true);
    setPasswordError("");
    setPasswordMessage("");

    try {
      await updatePassword(passwordData);
      setPasswordData({
        current_password: "",
        new_password: "",
      });
      setPasswordMessage("Password updated successfully.");
    } catch (saveError) {
      setPasswordError(saveError.message);
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    await refreshCartCount();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <main className="account-page">
        <section className="site-container account-layout" aria-label="Loading account">
          <div className="account-card">Loading account...</div>
        </section>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="account-page">
        <section className="site-container account-layout" aria-label="Account error">
          <div className="account-card">{error}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <section className="site-container account-layout" aria-labelledby="account-title">
        <aside className="account-sidebar">
          <span className="account-avatar" aria-hidden="true">
            <UserRound size={34} />
          </span>
          <p className="home-eyebrow">Customer Account</p>
          <h1 id="account-title">{user.name}</h1>
          <p>Manage your profile, delivery details, and order access.</p>

          <div className="account-stats" aria-label="Account stats">
            {accountStats.map((stat) => (
              <article key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>

          <Link className="account-orders-link" to="/orders">
            <PackageCheck aria-hidden="true" size={17} />
            View My Orders
          </Link>
        </aside>

        <div className="account-content">
          <form className="account-card" aria-label="Profile information" onSubmit={handleSave}>
            <div className="account-card-header">
              <div>
                <h2>Profile Information</h2>
                <p>Keep your customer details updated.</p>
              </div>
              <ShieldCheck aria-hidden="true" size={22} />
            </div>

            <div className="account-form-grid">
              <label className="auth-field">
                <span>Full Name</span>
                <div>
                  <UserRound aria-hidden="true" size={18} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    maxLength={50}
                  />
                </div>
              </label>
              <label className="auth-field">
                <span>Email</span>
                <div>
                  <Mail aria-hidden="true" size={18} />
                  <input type="email" value={user.email} readOnly />
                </div>
              </label>
              <label className="auth-field">
                <span>Phone</span>
                <div>
                  <Phone aria-hidden="true" size={18} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    minLength={8}
                    maxLength={8}
                    placeholder="45223344"
                  />
                </div>
              </label>
              <label className="auth-field">
                <span>Address</span>
                <div>
                  <MapPin aria-hidden="true" size={18} />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    maxLength={50}
                  />
                </div>
              </label>
            </div>

            {error && <p className="auth-error">{error}</p>}
            {saveMessage && <p className="auth-success">{saveMessage}</p>}

            <button className="auth-submit-button" type="submit" disabled={isSaving}>
              <Save aria-hidden="true" size={16} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <section className="account-card" aria-labelledby="delivery-title">
            <div className="account-card-header">
              <div>
                <h2 id="delivery-title">Delivery Address</h2>
                <p>Default address used during checkout.</p>
              </div>
              <MapPin aria-hidden="true" size={22} />
            </div>
            <div className="account-address-box">
              <strong>{user.address || "No address saved"}</strong>
              <span>{user.phone ? `Phone: ${user.phone}` : "No phone saved"}</span>
            </div>
          </section>

          <form className="account-card" aria-label="Password settings" onSubmit={handlePasswordSave}>
            <div className="account-card-header">
              <div>
                <h2>Password</h2>
                <p>Update your login password.</p>
              </div>
              <KeyRound aria-hidden="true" size={22} />
            </div>

            <div className="account-form-grid">
              <label className="auth-field">
                <span>Current Password</span>
                <div>
                  <KeyRound aria-hidden="true" size={18} />
                  <input
                    type="password"
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    minLength={8}
                    maxLength={30}
                    required
                  />
                </div>
              </label>
              <label className="auth-field">
                <span>New Password</span>
                <div>
                  <ShieldCheck aria-hidden="true" size={18} />
                  <input
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    minLength={8}
                    maxLength={30}
                    required
                  />
                </div>
              </label>
            </div>

            {passwordError && <p className="auth-error">{passwordError}</p>}
            {passwordMessage && <p className="auth-success">{passwordMessage}</p>}

            <button className="auth-submit-button" type="submit" disabled={isPasswordSaving}>
              <KeyRound aria-hidden="true" size={16} />
              {isPasswordSaving ? "Updating..." : "Update Password"}
            </button>
          </form>

          <section className="account-card account-danger-card" aria-labelledby="security-title">
            <div>
              <h2 id="security-title">Session</h2>
              <p>Logout from this temporary frontend session.</p>
            </div>
            <button className="account-logout-button" type="button" onClick={handleLogout}>
              <LogOut aria-hidden="true" size={16} />
              Logout
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}

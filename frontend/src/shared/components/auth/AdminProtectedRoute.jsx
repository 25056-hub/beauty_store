import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "../../api/authApi";
import { isAuthenticated } from "../../api/client";

export default function AdminProtectedRoute({ children }) {
  const location = useLocation();
  const [state, setState] = useState({
    loading: true,
    user: null,
    error: null,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      setState({ loading: false, user: null, error: "Not logged in" });
      return;
    }

    let isActive = true;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        if (isActive) {
          setState({ loading: false, user: currentUser, error: null });
        }
      } catch (error) {
        if (isActive) {
          setState({ loading: false, user: null, error: error.message });
        }
      }
    }

    loadUser();

    return () => {
      isActive = false;
    };
  }, []);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (state.loading) {
    return (
      <main className="admin-page">
        <div className="admin-loading">Checking admin access...</div>
      </main>
    );
  }

  if (state.error) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (state.user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

import Footer from "./website/components/layout/Footer";
import Navbar from "./website/components/layout/Navbar";
import ScrollToHash from "./website/components/layout/ScrollToHash";
import AdminProtectedRoute from "./shared/components/auth/AdminProtectedRoute";
import ProtectedRoute from "./shared/components/auth/ProtectedRoute";
import { CartProvider } from "./shared/context/CartContext";
import AccountPage from "./website/pages/AccountPage";
import CartPage from "./website/pages/CartPage";
import ConfirmationPage from "./website/pages/ConfirmationPage";
import HomePage from "./website/pages/HomePage";
import LoginPage from "./website/pages/LoginPage";
import OrderDetailsPage from "./website/pages/OrderDetailsPage";
import OrdersPage from "./website/pages/OrdersPage";
import PaymentPage from "./website/pages/PaymentPage";
import ProductDetailsPage from "./website/pages/ProductDetailsPage";
import ProductsPage from "./website/pages/ProductsPage";
import RegisterPage from "./website/pages/RegisterPage";
import AdminCategoriesPage from "./admin/pages/AdminCategoriesPage";
import AdminDashboardPage from "./admin/pages/AdminDashboardPage";
import AdminOrdersPage from "./admin/pages/AdminOrdersPage";
import AdminPaymentsPage from "./admin/pages/AdminPaymentsPage";
import AdminProductsPage from "./admin/pages/AdminProductsPage";
import AdminReportsPage from "./admin/pages/AdminReportsPage";
import AdminUsersPage from "./admin/pages/AdminUsersPage";
import { Route, Routes, useLocation } from "react-router-dom";

export default function App() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <div className="app-shell">
      <CartProvider>
        <ScrollToHash />
        {!isAdminPage && <Navbar />}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/checkout/confirmation" element={<ProtectedRoute><ConfirmationPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/orders/:orderSlug" element={<ProtectedRoute><OrderDetailsPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
          <Route path="/admin/payments" element={<AdminProtectedRoute><AdminPaymentsPage /></AdminProtectedRoute>} />
          <Route path="/admin/products" element={<AdminProtectedRoute><AdminProductsPage /></AdminProtectedRoute>} />
          <Route path="/admin/categories" element={<AdminProtectedRoute><AdminCategoriesPage /></AdminProtectedRoute>} />
          <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrdersPage /></AdminProtectedRoute>} />
          <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsersPage /></AdminProtectedRoute>} />
          <Route path="/admin/reports" element={<AdminProtectedRoute><AdminReportsPage /></AdminProtectedRoute>} />
        </Routes>
        {!isAdminPage && <Footer />}
      </CartProvider>
    </div>
  );
}

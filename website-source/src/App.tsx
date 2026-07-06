import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useCartStore } from './stores/cartStore';
import { ToastProvider } from './components/ui/Toast';

// Admin Pages
import {
  AdminLayout,
  DashboardPage as AdminDashboard,
  ProductsPage as AdminProducts,
  OffersPage,
  OrdersPage as AdminOrders,
  CustomerServicePage,
  GrowthChatPage,
  ImageGenPage,
  CollabChatPage,
} from './pages/admin';

// Customer Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrdersPage from './pages/OrdersPage';

function AppContent() {
  const { initialize, loading, profile } = useAuthStore();
  const { loadCart } = useCartStore();
  const { user } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [user, loadCart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <Routes>
      {/* Admin Routes */}
      {isAdmin && (
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/offers" element={<OffersPage />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/customer-service" element={<CustomerServicePage />} />
          <Route path="/admin/growth-chat" element={<GrowthChatPage />} />
          <Route path="/admin/image-gen" element={<ImageGenPage />} />
          <Route path="/admin/collab-chat" element={<CollabChatPage />} />
        </Route>
      )}

      {/* Customer Pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/orders" element={<OrdersPage />} />

      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;

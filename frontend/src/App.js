import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './auth/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import CartSidebar from './components/CartSidebar';
import Login from "./pages/Login";
import Register from "./pages/Register";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import ProductDetailPage from "./pages/ProductDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import BorrowPage from "./pages/BorrowPage";
import AddBorrowItem from "./pages/AddBorrowItem";
import PaymentVerifyPage from "./pages/PaymentVerifyPage";
import PaymentFailedPage from "./pages/PaymentFailedPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
        <div className="App" style={{ paddingBottom: '70px', minHeight: '100vh', backgroundColor: '#EAF4FE' }}>
          <Header />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <UnifiedDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/product/:id" element={
              <ProtectedRoute>
                <ProductDetailPage />
              </ProtectedRoute>
            } />
            
            {/* Generic Cart Checkout Route */}
            <Route path="/checkout" element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            } />

            {/* Direct Item Checkout Route */}
            <Route path="/checkout/:id" element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/messages" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />

            <Route path="/messages/:conversationId" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />

            <Route path="/borrow" element={
              <ProtectedRoute>
                <BorrowPage />
              </ProtectedRoute>
            } />

            <Route path="/add-borrow" element={
              <ProtectedRoute>
                <AddBorrowItem />
              </ProtectedRoute>
            } />

            <Route path="/payment/verify" element={
              <ProtectedRoute>
                <PaymentVerifyPage />
              </ProtectedRoute>
            } />

            <Route path="/payment/failed" element={
              <ProtectedRoute>
                <PaymentFailedPage />
              </ProtectedRoute>
            } />

            <Route path="/order-success" element={
              <ProtectedRoute>
                <OrderSuccessPage />
              </ProtectedRoute>
            } />

            <Route path="/deliveries" element={
              <ProtectedRoute>
                <DeliveriesPage />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <BottomNav />
          <CartSidebar />
        </div>
      </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

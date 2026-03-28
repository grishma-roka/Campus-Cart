import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './auth/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from "./pages/Login";
import Register from "./pages/Register";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import ProductDetail from "./pages/ProductDetail";
import ProductDetailPage from "./pages/ProductDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import BorrowPage from "./pages/BorrowPage";
import PaymentVerifyPage from "./pages/PaymentVerifyPage";
import PaymentFailedPage from "./pages/PaymentFailedPage";
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
        <div className="App">
          <Navbar />
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

            <Route path="/borrow" element={
              <ProtectedRoute>
                <BorrowPage />
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
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

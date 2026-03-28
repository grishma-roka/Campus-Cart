import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PaymentFailedPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444', margin: '0 0 8px' }}>Payment Cancelled</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>Your payment was cancelled or failed. No order was created.</p>
        <button onClick={() => navigate(-2)} style={{ display: 'block', width: '100%', padding: '14px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', fontFamily: 'Inter, sans-serif', marginBottom: '10px' }}>
          Try Again
        </button>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'block', width: '100%', padding: '12px', background: 'transparent', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

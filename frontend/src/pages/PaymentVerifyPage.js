import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';

export default function PaymentVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [amount, setAmount] = useState(null);
  const [riderRequested, setRiderRequested] = useState(false);
  const calledRef = useRef(false); // prevent double-call in StrictMode

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    verify();
  }, []); // eslint-disable-line

  const verify = async () => {
    try {
      const encodedData = searchParams.get('data');
      if (!encodedData) {
        setStatus('failed');
        setMessage('Payment was cancelled or failed.');
        return;
      }
      const ctxRaw = sessionStorage.getItem('esewa_checkout') || localStorage.getItem('esewa_checkout');
      if (!ctxRaw) {
        setStatus('failed');
        setMessage('Checkout session expired. Please try again from the product page.');
        return;
      }
      const ctx = JSON.parse(ctxRaw);
      const res = await axios.post('/payment/esewa/verify', {
        encodedData,
        item_id: ctx.item_id,
        delivery_address: ctx.delivery_address,
        delivery_lat: ctx.delivery_lat,
        delivery_lng: ctx.delivery_lng,
        phone: ctx.phone,
        notes: ctx.notes,
      });
      sessionStorage.removeItem('esewa_checkout');
      localStorage.removeItem('esewa_checkout');
      if (res.data.verified) {
        setStatus('success');
        setOrderId(res.data.orderId);
        setAmount(res.data.amount);
        setMessage('Payment verified successfully!');
      } else {
        setStatus('failed');
        setMessage(res.data.error || 'Payment verification failed.');
      }
    } catch (err) {
      setStatus('failed');
      setMessage(err.response?.data?.error || 'Payment verification failed. Please contact support.');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>

        {status === 'verifying' && (
          <>
            <div style={s.spinner} />
            <h2 style={s.title}>Verifying Payment...</h2>
            <p style={s.sub}>Please wait while we confirm your payment with eSewa.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ ...s.title, color: '#10b981' }}>Payment Successful!</h2>
            <p style={s.sub}>{message}</p>

            <div style={s.orderBox}>
              <div style={s.orderRow}>
                <span style={s.orderLabel}>Order ID</span>
                <span style={s.orderVal}>#{orderId}</span>
              </div>
              <div style={s.orderRow}>
                <span style={s.orderLabel}>Amount Paid</span>
                <span style={{ ...s.orderVal, color: '#10b981', fontWeight: '700' }}>रू {amount}</span>
              </div>
              <div style={s.orderRow}>
                <span style={s.orderLabel}>Payment</span>
                <span style={s.esewaTag}>📱 eSewa — Paid Online</span>
              </div>
            </div>

            {!riderRequested ? (
              <>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '16px 0 8px', textAlign: 'center' }}>
                  Your order is confirmed. Request a rider to deliver your item.
                </p>
                <button onClick={() => setRiderRequested(true)} style={s.riderBtn}>
                  🏍️ Request Rider
                </button>
              </>
            ) : (
              <div style={s.riderConfirm}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏍️</div>
                <div style={{ fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>Rider Requested!</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Nearby riders have been notified. You'll get a notification when a rider accepts.
                </div>
              </div>
            )}

            <button onClick={() => navigate('/dashboard?tab=orders')} style={s.ghostBtn}>
              View My Orders
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>❌</div>
            <h2 style={{ ...s.title, color: '#ef4444' }}>Payment Failed</h2>
            <p style={s.sub}>{message}</p>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Your order was NOT created. No money was charged.
            </p>
            <button onClick={() => navigate(-2)} style={{ ...s.btn, background: '#ef4444' }}>
              Try Again
            </button>
            <button onClick={() => navigate('/dashboard')} style={s.ghostBtn}>
              Back to Dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#EAF4FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px' },
  card: { background: '#fff', borderRadius: '24px', padding: '40px 36px', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
  spinner: { width: '48px', height: '48px', border: '4px solid #EAF4FE', borderTop: '4px solid #F88000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#000', margin: '0 0 8px' },
  sub: { fontSize: '14px', color: '#374151', margin: '0 0 16px' },
  orderBox: { background: '#f8fafc', borderRadius: '14px', padding: '16px', marginBottom: '16px', textAlign: 'left' },
  orderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' },
  orderLabel: { fontSize: '12px', color: '#94a3b8', fontWeight: '600' },
  orderVal: { fontSize: '14px', fontWeight: '600', color: '#000' },
  esewaTag: { background: '#d1fae5', color: '#065f46', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' },
  riderBtn: { display: 'block', width: '100%', padding: '14px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', fontFamily: 'Inter, sans-serif', marginBottom: '10px', boxShadow: '0 4px 12px rgba(248,128,0,0.3)' },
  riderConfirm: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px', marginBottom: '12px' },
  btn: { display: 'block', width: '100%', padding: '13px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'Inter, sans-serif', marginBottom: '10px' },
  ghostBtn: { display: 'block', width: '100%', padding: '12px', background: 'transparent', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif', marginTop: '8px' },
};

if (typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.textContent = '@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
  document.head.appendChild(st);
}

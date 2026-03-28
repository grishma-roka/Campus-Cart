import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';

export default function PaymentVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying|success|failed
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    verify();
  }, []); // eslint-disable-line

  const verify = async () => {
    try {
      // eSewa sends ?data=<base64encoded> on redirect
      const encodedData = searchParams.get('data');
      if (!encodedData) {
        setStatus('failed');
        setMessage('No payment data received from eSewa.');
        return;
      }

      // Retrieve checkout context saved before redirect
      const ctxRaw = sessionStorage.getItem('esewa_checkout');
      if (!ctxRaw) {
        setStatus('failed');
        setMessage('Checkout session expired. Please try again.');
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

      if (res.data.verified) {
        setStatus('success');
        setOrderId(res.data.orderId);
        setMessage(`Payment of रू ${res.data.amount} verified successfully!`);
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
            <div style={s.iconSuccess}>✅</div>
            <h2 style={{ ...s.title, color: '#10b981' }}>Payment Successful!</h2>
            <p style={s.sub}>{message}</p>
            {orderId && <p style={s.orderId}>Order #{orderId}</p>}
            <div style={s.badge}>📱 Paid via eSewa</div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
              Your order is confirmed. A rider will be assigned shortly.
            </p>
            <button onClick={() => navigate('/dashboard?tab=orders')} style={s.btn}>
              View My Orders
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={s.iconFailed}>❌</div>
            <h2 style={{ ...s.title, color: '#ef4444' }}>Payment Failed</h2>
            <p style={s.sub}>{message}</p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
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
  card: { background: '#fff', borderRadius: '24px', padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
  spinner: { width: '48px', height: '48px', border: '4px solid #EAF4FE', borderTop: '4px solid #F88000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' },
  iconSuccess: { fontSize: '56px', marginBottom: '16px' },
  iconFailed: { fontSize: '56px', marginBottom: '16px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#000', margin: '0 0 8px' },
  sub: { fontSize: '15px', color: '#374151', margin: '0 0 16px' },
  orderId: { fontSize: '13px', color: '#94a3b8', marginBottom: '12px' },
  badge: { display: 'inline-block', background: '#d1fae5', color: '#065f46', fontSize: '13px', fontWeight: '700', padding: '6px 16px', borderRadius: '20px', marginBottom: '8px' },
  btn: { display: 'block', width: '100%', padding: '14px', background: '#F88000', color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', fontFamily: 'Inter, sans-serif', marginTop: '20px' },
  ghostBtn: { display: 'block', width: '100%', padding: '12px', background: 'transparent', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif', marginTop: '10px' },
};

// Inject spinner animation
if (typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.textContent = '@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }';
  document.head.appendChild(st);
}

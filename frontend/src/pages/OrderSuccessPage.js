import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, MapPin, Phone, User } from 'lucide-react';

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderDetails } = location.state || {};

  return (
    <div style={s.container}>
      <div style={s.card}>
        {/* Success Icon */}
        <div style={s.iconWrap}>
          <CheckCircle size={64} color="#10b981" strokeWidth={1.5} />
        </div>

        <h1 style={s.title}>Your package is on the way!</h1>
        <p style={s.subtitle}>Thank you for shopping on Campus Cart 🎉</p>

        {orderDetails && (
          <div style={s.details}>
            <div style={s.detailRow}>
              <Package size={16} color="#64748b" />
              <span>{orderDetails.item_title}</span>
            </div>
            <div style={s.detailRow}>
              <User size={16} color="#64748b" />
              <span>{orderDetails.fullName}</span>
            </div>
            <div style={s.detailRow}>
              <Phone size={16} color="#64748b" />
              <span>{orderDetails.phone}</span>
            </div>
            <div style={s.detailRow}>
              <MapPin size={16} color="#64748b" />
              <span>{orderDetails.deliveryLocation}</span>
            </div>
            <div style={s.amountRow}>
              <span style={s.amountLabel}>Total (COD)</span>
              <span style={s.amount}>रू {orderDetails.total_amount?.toLocaleString()}</span>
            </div>
          </div>
        )}

        <p style={s.note}>
          The seller has been notified and will arrange delivery soon.
          You'll get a notification when a rider picks up your order.
        </p>

        <div style={s.actions}>
          <button onClick={() => navigate('/dashboard')} style={s.primaryBtn}>
            Continue Shopping
          </button>
          <button onClick={() => navigate('/dashboard?mode=buyer')} style={s.ghostBtn}>
            View My Orders
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: {
    minHeight: '100vh',
    background: '#EAF4FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'Inter, sans-serif'
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '48px 40px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
  },
  iconWrap: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center'
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 8px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 28px'
  },
  details: {
    background: '#f8fafc',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#374151'
  },
  amountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    marginTop: '4px'
  },
  amountLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b'
  },
  amount: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#F88000'
  },
  note: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: '1.6',
    marginBottom: '28px'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  primaryBtn: {
    padding: '14px',
    background: '#F88000',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  },
  ghostBtn: {
    padding: '14px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }
};

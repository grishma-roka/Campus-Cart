import React, { useState, useEffect } from 'react';
import { X, Calendar, Minus, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from '../api/axios';

export default function BorrowBottomSheet({ item, onClose, onSuccess }) {
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation trigger
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  if (!item) return null;

  const totalCost = (days * parseFloat(item.price_per_day || 0)).toFixed(2);

  const handleBorrow = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/borrow/request', {
        item_id: item.id,
        duration: days,
        owner_id: item.seller_id // From backend schema reqs
      });
      
      if (onSuccess) onSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div 
        style={{
          ...styles.sheet,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={styles.dragHandle} />

        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <h3 style={styles.title}>Borrow Request</h3>
            <p style={styles.subtitle}>{item.title}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.priceSection}>
            <div style={styles.label}>Rate</div>
            <div style={styles.priceValue}>रू {item.price_per_day} / day</div>
          </div>

          <div style={styles.stepperSection}>
            <div style={styles.label}>Duration (Days)</div>
            <div style={styles.stepper}>
              <button 
                onClick={() => setDays(Math.max(1, days - 1))} 
                style={styles.stepBtn}
              >
                <Minus size={18} />
              </button>
              <span style={styles.dayValue}>{days}</span>
              <button 
                onClick={() => setDays(Math.min(30, days + 1))} 
                style={styles.stepBtn}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryRow}>
              <span>Estimated Return</span>
              <span style={styles.summaryValue}>
                {new Date(Date.now() + days * 86400000).toLocaleDateString()}
              </span>
            </div>
            <div style={styles.divider} />
            <div style={styles.totalRow}>
              <span>Total Amount</span>
              <span style={styles.totalValue}>रू {totalCost}</span>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button 
            onClick={handleBorrow}
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Sending Request...' : 'Send Borrow Request'}
          </button>
          
          <p style={styles.footerNote}>
            The owner will be notified to approve your request.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'flex-end',
    backdropFilter: 'blur(2px)'
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '12px 20px 40px',
    transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.1)'
  },
  dragHandle: {
    width: '40px',
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    margin: '0 auto 16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0'
  },
  closeBtn: {
    padding: '8px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    color: '#64748b'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  priceSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  priceValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b'
  },
  stepperSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '16px'
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: '#FFFFFF',
    padding: '6px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  stepBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#1e293b'
  },
  dayValue: {
    fontSize: '18px',
    fontWeight: '700',
    minWidth: '24px',
    textAlign: 'center'
  },
  summaryCard: {
    background: '#1e293b',
    borderRadius: '20px',
    padding: '20px',
    color: '#FFFFFF'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#94a3b8'
  },
  summaryValue: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: '12px 0'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#F88000'
  },
  submitBtn: {
    background: '#F88000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '16px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(248, 128, 0, 0.3)'
  },
  errorBox: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  }
};

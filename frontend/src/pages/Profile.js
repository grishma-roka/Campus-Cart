import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import axios from '../api/axios';
import {
  LogOut, User, Mail, Calendar, Hash, Edit3, Key, ChevronRight,
  TrendingUp, ShoppingBag, Bike, Store, Package, Clock, CheckCircle,
  CircleDollarSign, Wallet, Handshake
} from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const [income, setIncome] = useState(null);
  const [loadingIncome, setLoadingIncome] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get('/auth/income-summary')
      .then(res => setIncome(res.data))
      .catch(() => setIncome(null))
      .finally(() => setLoadingIncome(false));
  }, [user]);

  const handleLogout = () => {
    logout(); // AuthContext handles redirect to /login
  };

  if (!user) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading Profile...</p>
      </div>
    );
  }

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not available';

  const fmt = (val) => `रू ${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>

        {/* ─── Header Card ─────────────────────────────────── */}
        <div style={styles.card}>
          <div style={styles.headerContent}>
            <div style={styles.avatar}>
              <User size={48} color="#FFFFFF" strokeWidth={1.5} />
            </div>
            <h1 style={styles.userName}>{user.full_name || user.name || 'User'}</h1>
            <p style={styles.userEmail}>{user.email}</p>
            {/* Role badges */}
            <div style={styles.roleBadgeRow}>
              {(user.is_buyer || user.role === 'buyer') && <span style={{...styles.roleBadge, background: '#eff6ff', color: '#3b82f6'}}>Buyer</span>}
              {(user.is_seller || user.role === 'seller') && <span style={{...styles.roleBadge, background: '#fff7ed', color: '#F88000'}}>Seller</span>}
              {(user.is_rider || user.role === 'rider') && <span style={{...styles.roleBadge, background: '#f0fdf4', color: '#10b981'}}>Rider</span>}
              {(user.is_admin || user.role === 'admin') && <span style={{...styles.roleBadge, background: '#faf5ff', color: '#8b5cf6'}}>Admin</span>}
            </div>
          </div>
        </div>

        {/* ─── Income Card ─────────────────────────────────── */}
        <div style={styles.sectionHeader}>INCOME & ACTIVITY</div>
        {loadingIncome ? (
          <div style={styles.incomeLoading}>
            <div style={styles.spinner} />
          </div>
        ) : income ? (
          <div style={styles.incomeCard}>
            {/* Seller panel */}
            {income.seller && (
              <div style={styles.incomePanel}>
                <div style={styles.incomePanelHeader}>
                  <div style={{...styles.incomePanelIcon, background: '#fff7ed'}}>
                    <Store size={18} color="#F88000" />
                  </div>
                  <span style={styles.incomePanelTitle}>Seller Earnings</span>
                </div>
                <div style={{...styles.incomeBigNumber, color: '#F88000'}}>
                  {fmt(income.seller.total_sales)}
                </div>
                <p style={styles.incomeSub}>Total Revenue from {income.seller.total_orders || 0} orders</p>
                <div style={styles.incomePills}>
                  <div style={{...styles.pill, background: '#f0fdf4', color: '#10b981'}}>
                    <CheckCircle size={12} /> {fmt(income.seller.delivered_amount)} collected
                  </div>
                  <div style={{...styles.pill, background: '#fef9c3', color: '#b45309'}}>
                    <Clock size={12} /> {fmt(income.seller.pending_amount)} pending
                  </div>
                </div>
              </div>
            )}

            {/* Buyer panel */}
            {income.buyer && (
              <div style={{...styles.incomePanel, borderTop: income.seller ? '1px solid #f1f5f9' : 'none'}}>
                <div style={styles.incomePanelHeader}>
                  <div style={{...styles.incomePanelIcon, background: '#eff6ff'}}>
                    <ShoppingBag size={18} color="#3b82f6" />
                  </div>
                  <span style={styles.incomePanelTitle}>My Spending</span>
                </div>
                <div style={{...styles.incomeBigNumber, color: '#3b82f6'}}>
                  {fmt(income.buyer.total_spent)}
                </div>
                <p style={styles.incomeSub}>Total spent on {income.buyer.total_orders || 0} orders</p>
                <div style={styles.incomePills}>
                  <div style={{...styles.pill, background: '#f0fdf4', color: '#10b981'}}>
                    <Package size={12} /> {fmt(income.buyer.delivered_amount)} received
                  </div>
                  <div style={{...styles.pill, background: '#fef9c3', color: '#b45309'}}>
                    <Clock size={12} /> {fmt(income.buyer.pending_amount)} in transit
                  </div>
                </div>
              </div>
            )}

            {/* Rider panel */}
            {income.rider && (
              <div style={{...styles.incomePanel, borderTop: (income.seller || income.buyer) ? '1px solid #f1f5f9' : 'none'}}>
                <div style={styles.incomePanelHeader}>
                  <div style={{...styles.incomePanelIcon, background: '#f0fdf4'}}>
                    <Bike size={18} color="#10b981" />
                  </div>
                  <span style={styles.incomePanelTitle}>Delivery Earnings</span>
                </div>
                <div style={{...styles.incomeBigNumber, color: '#10b981'}}>
                  {fmt(income.rider.total_earned)}
                </div>
                <p style={styles.incomeSub}>{income.rider.completed || 0} deliveries completed</p>
                <div style={styles.incomePills}>
                  <div style={{...styles.pill, background: '#fef9c3', color: '#b45309'}}>
                    <Bike size={12} /> {income.rider.active || 0} active now
                  </div>
                  <div style={{...styles.pill, background: '#f0fdf4', color: '#10b981'}}>
                    <CircleDollarSign size={12} /> रू 50 / delivery
                  </div>
                </div>
              </div>
            )}

            {/* Borrow Lender panel */}
            {income.borrow_lender && (
              <div style={{...styles.incomePanel, borderTop: '1px solid #f1f5f9'}}>
                <div style={styles.incomePanelHeader}>
                  <div style={{...styles.incomePanelIcon, background: '#fff7ed'}}>
                    <Handshake size={18} color="#F88000" />
                  </div>
                  <span style={styles.incomePanelTitle}>Borrow Lending Income</span>
                </div>
                <div style={{...styles.incomeBigNumber, color: '#F88000'}}>
                  {fmt(income.borrow_lender.total_earned)}
                </div>
                <p style={styles.incomeSub}>{income.borrow_lender.completed || 0} items returned & paid</p>
                <div style={styles.incomePills}>
                  <div style={{...styles.pill, background: '#f0fdf4', color: '#10b981'}}>
                    <CheckCircle size={12} /> {income.borrow_lender.completed || 0} completed
                  </div>
                  <div style={{...styles.pill, background: '#eff6ff', color: '#3b82f6'}}>
                    <Clock size={12} /> {income.borrow_lender.currently_active || 0} active borrows
                  </div>
                </div>
              </div>
            )}

            {/* Borrow Borrower panel */}
            {income.borrow_borrower && (
              <div style={{...styles.incomePanel, borderTop: '1px solid #f1f5f9'}}>
                <div style={styles.incomePanelHeader}>
                  <div style={{...styles.incomePanelIcon, background: '#eff6ff'}}>
                    <Handshake size={18} color="#3b82f6" />
                  </div>
                  <span style={styles.incomePanelTitle}>Borrowing Costs</span>
                </div>
                <div style={{...styles.incomeBigNumber, color: '#3b82f6'}}>
                  {fmt(income.borrow_borrower.total_spent)}
                </div>
                <p style={styles.incomeSub}>Total spent on {income.borrow_borrower.total_borrowed || 0} requests</p>
                <div style={styles.incomePills}>
                  <div style={{...styles.pill, background: '#f0fdf4', color: '#10b981'}}>
                    <Package size={12} /> {fmt(income.borrow_borrower.total_spent)} paid
                  </div>
                  <div style={{...styles.pill, background: '#fef9c3', color: '#b45309'}}>
                    <Clock size={12} /> {income.borrow_borrower.currently_active || 0} active now
                  </div>
                </div>
              </div>
            )}

            {/* No income data */}
            {!income.seller && !income.buyer && !income.rider && (
              <div style={{padding: '32px', textAlign: 'center'}}>
                <Wallet size={40} color="#cbd5e1" style={{margin: '0 auto 12px'}} />
                <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>No financial activity yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.incomeError}>Could not load income data.</div>
        )}

        {/* ─── Account Details ──────────────────────────────── */}
        <div style={styles.sectionHeader}>ACCOUNT DETAILS</div>
        <div style={styles.card}>
          <div style={styles.detailRow}>
            <div style={styles.iconContainer}><User size={20} color="#64748b" /></div>
            <div style={styles.detailText}>
              <span style={styles.detailLabel}>Full Name</span>
              <span style={styles.detailValue}>{user.full_name}</span>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.detailRow}>
            <div style={styles.iconContainer}><Mail size={20} color="#64748b" /></div>
            <div style={styles.detailText}>
              <span style={styles.detailLabel}>Email Address</span>
              <span style={styles.detailValue}>{user.email}</span>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.detailRow}>
            <div style={styles.iconContainer}><Hash size={20} color="#64748b" /></div>
            <div style={styles.detailText}>
              <span style={styles.detailLabel}>Student ID</span>
              <span style={styles.detailValue}>{user.student_id || 'Not available'}</span>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={styles.detailRow}>
            <div style={styles.iconContainer}><Calendar size={20} color="#64748b" /></div>
            <div style={styles.detailText}>
              <span style={styles.detailLabel}>Joined At</span>
              <span style={styles.detailValue}>{joinedDate}</span>
            </div>
          </div>
        </div>

        {/* ─── Actions ─────────────────────────────────────── */}
        <div style={styles.sectionHeader}>ACTIONS</div>
        <div style={styles.actionGrid}>
          <button style={styles.ghostButton} onClick={() => alert('Editing profile coming soon!')}>
            <div style={styles.actionLeft}>
              <div style={styles.actionIconRing}><Edit3 size={18} /></div>
              <span>Edit Profile</span>
            </div>
            <ChevronRight size={16} opacity={0.5} />
          </button>

          <button style={styles.ghostButton} onClick={() => alert('Change password coming soon!')}>
            <div style={styles.actionLeft}>
              <div style={styles.actionIconRing}><Key size={18} /></div>
              <span>Change Password</span>
            </div>
            <ChevronRight size={16} opacity={0.5} />
          </button>
        </div>

        {/* ─── Logout ──────────────────────────────────────── */}
        <div style={{ marginTop: '40px' }}>
          <button onClick={handleLogout} style={styles.logoutButton}>
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>

        <p style={styles.footerText}>Campus Cart v2.1.2 • Secure Session</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '40px 20px 100px',
    backgroundColor: '#EAF4FE',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '500px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#EAF4FE',
  },
  loadingText: {
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '600',
  },

  // Header Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '4px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  headerContent: {
    padding: '32px 20px',
    textAlign: 'center',
  },
  avatar: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    backgroundColor: '#F88000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 8px 24px rgba(248, 128, 0, 0.25)',
  },
  userName: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  userEmail: {
    fontSize: '15px',
    color: '#64748b',
    margin: '0 0 14px',
  },
  roleBadgeRow: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
  },

  sectionHeader: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: '1.2px',
    marginBottom: '10px',
    paddingLeft: '12px',
  },

  // Income Card
  incomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  incomePanel: {
    padding: '20px 24px',
  },
  incomePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  incomePanelIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  incomePanelTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  incomeBigNumber: {
    fontSize: '34px',
    fontWeight: '800',
    lineHeight: '1',
    marginBottom: '4px',
    letterSpacing: '-0.5px',
  },
  incomeSub: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '0 0 12px',
    fontWeight: '500',
  },
  incomePills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
  },
  incomeLoading: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '40px',
    textAlign: 'center',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid rgba(248,128,0,0.15)',
    borderTop: '3px solid #F88000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  incomeError: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '20px',
    textAlign: 'center',
    color: '#94a3b8',
    marginBottom: '24px',
    fontSize: '13px',
  },

  // Account Details
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    transition: 'background 0.2s ease',
  },
  iconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
    flexShrink: 0,
  },
  detailText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '0 20px',
  },

  // Actions
  actionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ghostButton: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
    borderRadius: '20px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  },
  actionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  actionIconRing: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: '#fff7ed',
    color: '#F88000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logout
  logoutButton: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fee2e2',
    padding: '18px',
    borderRadius: '22px',
    width: '100%',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'Inter, sans-serif',
    fontSize: '15px',
  },
  footerText: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#cbd5e1',
    marginTop: '32px',
    fontWeight: '500',
  },
};
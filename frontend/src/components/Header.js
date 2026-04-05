import React, { useState, useEffect } from 'react';
import { ShoppingBag, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationBell from './NotificationBell';
import SmartSearchBar from './SmartSearchBar';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isRider } = useAuth();
  const { setIsCartOpen, getCartCount } = useCart();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024); // Adjusted for more space

  // Parse mode from URL
  const queryParams = new URLSearchParams(location.search);
  const currentMode = queryParams.get('mode') || 'buyer';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleModeChange = (mode) => {
    navigate(`/dashboard?mode=${mode}`);
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return (
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoText}>Campus</span>
          <span style={{ ...styles.logoText, color: '#F88000' }}>Cart</span>
        </div>
      </header>
    );
  }

  return (
    <header style={styles.header}>
      {/* 1. Logo Section */}
      <div style={styles.logo} onClick={() => navigate('/dashboard')}>
        <span style={styles.logoText}>Campus</span>
        <span style={{ ...styles.logoText, color: '#F88000' }}>Cart</span>
      </div>

      {/* 2. Flexible Search Bar Section */}
      <div style={styles.searchWrapper}>
        <SmartSearchBar 
          onSearch={(term) => {
            navigate(`/dashboard?search=${encodeURIComponent(term)}&mode=${currentMode}`);
          }} 
        />
      </div>

      {/* 3. Global Mode Switcher (Pill Design) - Hidden on Mobile */}
      {!isMobile && (
        <div style={styles.modeSwitcherPill}>
          <button 
            onClick={() => handleModeChange('buyer')}
            style={{
              ...styles.modeBtn,
              ...(currentMode === 'buyer' ? styles.activeMode : {})
            }}
          >
            Buyer
          </button>
          <button 
            onClick={() => handleModeChange('seller')}
            style={{
              ...styles.modeBtn,
              ...(currentMode === 'seller' ? styles.activeMode : {})
            }}
          >
            Seller
          </button>
        </div>
      )}

      {/* 4. Right side actions */}
      <div style={styles.actions}>
        <NotificationBell />

        <button 
          onClick={() => setIsCartOpen(true)} 
          style={styles.cartBtn}
          title="Shopping Cart"
        >
          <div style={styles.cartIconWrapper}>
            <ShoppingBag size={22} color="#2D3436" strokeWidth={2} />
            {getCartCount() > 0 && (
              <span style={styles.badge}>{getCartCount()}</span>
            )}
          </div>
          {!isMobile && <span style={styles.cartText}>Cart</span>}
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    height: '70px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    borderBottom: '1px solid #f3f4f6',
    zIndex: 100,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    flexShrink: 0
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '800',
    letterSpacing: '-0.5px'
  },
  searchWrapper: {
    flexGrow: 1,
    margin: '0 20px',
    maxWidth: '450px', // Constrained as requested
    display: 'flex',
    justifyContent: 'center'
  },
  modeSwitcherPill: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f1f5f9', // bg-gray-100
    borderRadius: '50px',
    padding: '4px',
    gap: '4px',
    marginRight: '20px',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
  },
  modeBtn: {
    padding: '8px 16px',
    borderRadius: '50px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#64748b', // text-gray-500
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    whiteSpace: 'nowrap'
  },
  activeMode: {
    backgroundColor: '#F88000',
    color: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(248, 128, 0, 0.3)'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexShrink: 0
  },
  cartBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '12px',
    transition: 'all 0.2s ease'
  },
  cartIconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cartText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2D3436', // Dark Grey
    fontFamily: 'Inter, sans-serif'
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#ef4444',
    color: '#FFFFFF',
    fontSize: '10px',
    fontWeight: '800',
    minWidth: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #FFFFFF'
  }
};

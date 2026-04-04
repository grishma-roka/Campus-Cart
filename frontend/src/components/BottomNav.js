import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Store, Bike, MessageCircle, User, Handshake } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const tabs = [
    { id: 'dashboard', icon: <Home size={24} />, label: 'Home', path: '/dashboard' },
    { id: 'borrow', icon: <Handshake size={24} />, label: 'Borrow', path: '/borrow' },
    { id: 'seller', icon: <Store size={24} />, label: 'My Store', path: '/dashboard?mode=seller', visible: user && (user.is_seller || user.role?.toLowerCase() === 'seller') },
    { id: 'delivery', icon: <Bike size={24} />, label: 'Deliveries', path: '/dashboard?mode=rider', visible: user && (user.is_rider || user.role?.toLowerCase() === 'rider') },
    { id: 'messages', icon: <MessageCircle size={24} />, label: 'Messages', path: '/messages' },
    { id: 'profile', icon: <User size={24} />, label: 'Profile', path: '/profile' }
  ];

  const isActive = (path) => {
    if (path.includes('?mode=')) {
      return location.search.includes(path.split('?')[1]);
    }
    return location.pathname === path && !location.search;
  };

  return (
    <nav style={styles.nav}>
      {tabs.filter(tab => tab.visible !== false).map((tab) => (
        <button
          key={tab.id}
          onClick={() => navigate(tab.path)}
          style={{
            ...styles.tab,
            color: isActive(tab.path) ? '#F88000' : '#64748b'
          }}
        >
          <div style={{ position: 'relative' }}>
            {tab.icon}
          </div>
          <span style={styles.label}>{tab.label}</span>
          {isActive(tab.path) && <div style={styles.activeIndicator} />}
        </button>
      ))}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.03)',
    zIndex: 1000,
    paddingBottom: 'env(safe-area-inset-bottom)'
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    padding: '8px 0',
    flex: 1,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    minWidth: '60px'
  },
  label: {
    fontSize: '9px', // Slightly smaller font for better fit
    fontWeight: '700',
    marginTop: '4px',
    whiteSpace: 'nowrap'
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: '20px',
    height: '3px',
    backgroundColor: '#F88000',
    borderRadius: '0 0 4px 4px'
  }
};

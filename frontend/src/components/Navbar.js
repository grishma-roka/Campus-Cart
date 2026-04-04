import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ShoppingCart, Home, Search, Package, Store, Truck, Settings, LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated, availableRoles } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <Link to="/dashboard" style={styles.logo}>
          <div style={styles.logoIcon}><ShoppingCart size={24} color="#FFF" strokeWidth={2} /></div>
          <span style={styles.logoText}>Campus Cart</span>
        </Link>
        
        <div style={styles.navLinks}>
          <Link to="/dashboard" style={styles.navLink} className="nav-link">
            <span style={styles.navIcon}><Home size={16} strokeWidth={2} /></span>
            Dashboard
          </Link>
          
          <Link to="/dashboard?tab=browse" style={styles.navLink} className="nav-link">
            <span style={styles.navIcon}><Search size={16} strokeWidth={2} /></span>
            Browse
          </Link>
          
          <Link to="/dashboard?tab=orders" style={styles.navLink} className="nav-link">
            <span style={styles.navIcon}><Package size={16} strokeWidth={2} /></span>
            Orders
          </Link>
          
          {availableRoles?.includes('seller') && (
            <Link to="/dashboard?mode=seller" style={styles.navLink} className="nav-link">
              <span style={styles.navIcon}><Store size={16} strokeWidth={2} /></span>
              Sell
            </Link>
          )}
          
          {availableRoles?.includes('rider') && (
            <Link to="/dashboard?mode=rider" style={styles.navLink} className="nav-link">
              <span style={styles.navIcon}><Truck size={16} strokeWidth={2} /></span>
              Deliver
            </Link>
          )}
          
          {availableRoles?.includes('admin') && (
            <Link to="/dashboard?mode=admin" style={styles.navLink} className="nav-link">
              <span style={styles.navIcon}><Settings size={16} strokeWidth={2} /></span>
              Admin
            </Link>
          )}
        </div>
        
        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={styles.userDetails}>
              <span style={styles.userName}>{user?.full_name}</span>
              <div style={styles.rolesBadges}>
                {availableRoles?.map(role => (
                  <span key={role} style={{
                    ...styles.roleBadge,
                    backgroundColor: getRoleColor(role)
                  }}>
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <button onClick={handleLogout} style={styles.logoutBtn} className="logout-btn">
            <span style={styles.logoutIcon}><LogOut size={16} strokeWidth={2.5} /></span>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

const getRoleColor = (role) => {
  const colors = {
    buyer: '#F88000',
    seller: '#F88000',
    rider: '#F88000',
    admin: '#F88000'
  };
  return colors[role] || '#F88000';
};

const styles = {
  navbar: {
    position: 'fixed',
    top: '20px',
    left: '20px',
    right: '20px',
    zIndex: 1000,
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '24px',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
    padding: '12px 24px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    fontWeight: '700',
    fontSize: '1.25rem'
  },
  logoIcon: {
    background: '#F88000',
    borderRadius: '12px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: {
    color: '#F88000',
    fontWeight: '700'
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '16px',
    textDecoration: 'none',
    color: '#000000',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    background: 'transparent'
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: '#F88000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '1rem'
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  userName: {
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontWeight: '600',
    lineHeight: '1.2'
  },
  rolesBadges: {
    display: 'flex',
    gap: '4px'
  },
  roleBadge: {
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '10px 16px',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'Inter, sans-serif'
  },
  logoutIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

// Add hover effects with CSS-in-JS
const hoverStyles = `
  .nav-link:hover {
    background: #EAF4FE !important;
    color: #F88000 !important;
    transform: translateY(-1px);
  }
  
  .logout-btn:hover {
    background: rgba(239, 68, 68, 0.15) !important;
    transform: translateY(-1px);
  }
`;

// Inject hover styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = hoverStyles;
  document.head.appendChild(styleSheet);
}

export default Navbar;
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Navbar = () => {
  const { user, userRoles, logout, isAuthenticated, availableRoles } = useAuth();
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
          Campus Cart
        </Link>
        
        <div style={styles.navLinks}>
          <Link to="/dashboard" style={styles.link}>Dashboard</Link>
          
          {/* Universal navigation - works for all roles */}
          <Link to="/dashboard?tab=browse" style={styles.link}>Browse Items</Link>
          <Link to="/dashboard?tab=orders" style={styles.link}>My Orders</Link>
          <Link to="/dashboard?tab=borrows" style={styles.link}>My Borrows</Link>
          
          {/* Show seller-specific links if user has seller role */}
          {availableRoles?.includes('seller') && (
            <Link to="/dashboard?mode=seller" style={styles.link}>Seller Mode</Link>
          )}
          
          {/* Show rider-specific links if user has rider role */}
          {availableRoles?.includes('rider') && (
            <Link to="/dashboard?mode=rider" style={styles.link}>Rider Mode</Link>
          )}
          
          {/* Show admin links if user has admin role */}
          {availableRoles?.includes('admin') && (
            <Link to="/dashboard?mode=admin" style={styles.link}>Admin Panel</Link>
          )}
          
          <Link to="/messages" style={styles.link}>Messages</Link>
          <Link to="/profile" style={styles.link}>Profile</Link>
        </div>
        
        <div style={styles.userSection}>
          <span style={styles.userName}>
            {user?.full_name}
          </span>
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
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

const getRoleColor = (role) => {
  const colors = {
    buyer: '#3498db',
    seller: '#27ae60',
    rider: '#f39c12',
    admin: '#e74c3c'
  };
  return colors[role] || '#95a5a6';
};

const styles = {
  navbar: {
    backgroundColor: '#2c3e50',
    padding: '1rem 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1rem'
  },
  logo: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    textDecoration: 'none'
  },
  navLinks: {
    display: 'flex',
    gap: '1.5rem'
  },
  link: {
    color: '#ecf0f1',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.3s'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  userName: {
    color: '#ecf0f1',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  rolesBadges: {
    display: 'flex',
    gap: '0.25rem'
  },
  roleBadge: {
    padding: '0.2rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase'
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  }
};

export default Navbar;
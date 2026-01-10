import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
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
          
          {user?.role === 'buyer' && (
            <>
              <Link to="/items" style={styles.link}>Browse Items</Link>
              <Link to="/my-orders" style={styles.link}>My Orders</Link>
              <Link to="/my-borrows" style={styles.link}>My Borrows</Link>
            </>
          )}
          
          {user?.role === 'seller' && (
            <>
              <Link to="/my-items" style={styles.link}>My Items</Link>
              <Link to="/seller-orders" style={styles.link}>Orders</Link>
              <Link to="/borrow-requests" style={styles.link}>Borrow Requests</Link>
            </>
          )}
          
          {user?.role === 'rider' && (
            <>
              <Link to="/available-deliveries" style={styles.link}>Available Deliveries</Link>
              <Link to="/my-deliveries" style={styles.link}>My Deliveries</Link>
            </>
          )}
          
          {user?.role === 'admin' && (
            <Link to="/admin" style={styles.link}>Admin Panel</Link>
          )}
          
          <Link to="/messages" style={styles.link}>Messages</Link>
          <Link to="/profile" style={styles.link}>Profile</Link>
        </div>
        
        <div style={styles.userSection}>
          <span style={styles.userName}>
            {user?.full_name} ({user?.role})
          </span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
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
    fontSize: '0.9rem'
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
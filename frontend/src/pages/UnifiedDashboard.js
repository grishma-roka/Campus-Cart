import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import RoleSwitcher from '../components/RoleSwitcher';
import BuyerDashboard from './BuyerDashboard';
import SellerDashboard from './SellerDashboard';
import RiderDashboard from './RiderDashboard';
import AdminDashboard from './AdminDashboard';
import BorrowPage from './BorrowPage';

export default function UnifiedDashboard() {
  const { user, updateUserRole, userRoles, availableRoles, primaryRole } = useAuth();
  
  // Debug user state as requested
  console.log('Current User:', user);

  const location = useLocation();
  const navigate = useNavigate();
  // Initialize mode from localStorage or URL or default to buyer
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('dashboardMode');
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    return modeParam || savedMode || 'buyer';
  });

  // Update localStorage whenever mode changes
  useEffect(() => {
    localStorage.setItem('dashboardMode', mode);
  }, [mode]);

  useEffect(() => {
    // Check URL parameters for mode
    const urlParams = new URLSearchParams(location.search);
    const modeParam = urlParams.get('mode');
    
    if (modeParam && ['buyer', 'seller', 'rider', 'admin', 'borrow'].includes(modeParam)) {
      setMode(modeParam);
    } else if (!mode && primaryRole) {
      setMode(primaryRole);
    }
  }, [location, primaryRole, mode]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Update URL using navigate to trigger location changes
    navigate(`${window.location.pathname}?mode=${newMode}`);
  };

  if (!user || !userRoles) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  const renderDashboard = () => {
    console.log('🎯 UnifiedDashboard rendering mode:', mode);
    switch (mode) {
      case 'buyer':
        console.log('🛒 Rendering BuyerDashboard');
        return <BuyerDashboard />;
      case 'seller':
        console.log('🏪 Rendering SellerDashboard');
        return <SellerDashboard />;
      case 'rider':
        console.log('🚚 Rendering RiderDashboard');
        return <RiderDashboard />;
      case 'admin':
        console.log('⚙️ Rendering AdminDashboard');
        return <AdminDashboard />;
      case 'borrow':
        console.log('🔄 Rendering BorrowDashboard');
        return <BorrowPage />;
      default:
        console.log('🛒 Rendering default BuyerDashboard');
        return <BuyerDashboard />;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.welcomeSection}>
          <h1 style={styles.welcomeTitle}>Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
          <p style={styles.subtitle}>Manage your campus activities across different modes</p>
        </div>
        <RoleSwitcher 
          user={user} 
          currentMode={mode} 
          onModeChange={handleModeChange} 
        />
      </div>
      <div style={styles.dashboardContent}>
        {renderDashboard()}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#EAF4FE'
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: '2rem',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
    borderRadius: '16px',
    position: 'relative',
    zIndex: 1
  },
  welcomeSection: {
    marginBottom: '1rem'
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    margin: '4px 0 0',
    fontWeight: '500'
  },
  dashboardContent: {
    padding: '0' // Let individual dashboards handle their own padding
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '1.2rem',
    color: '#000000',
    backgroundColor: '#EAF4FE'
  }
};
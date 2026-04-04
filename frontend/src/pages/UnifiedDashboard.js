import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLocation } from 'react-router-dom';
import RoleSwitcher from '../components/RoleSwitcher';
import BuyerDashboard from './BuyerDashboard';
import SellerDashboard from './SellerDashboard';
import RiderDashboard from './RiderDashboard';
import AdminDashboard from './AdminDashboard';

export default function UnifiedDashboard() {
  const { user, userRoles, availableRoles, primaryRole } = useAuth();
  const location = useLocation();
  const [currentMode, setCurrentMode] = useState('buyer');

  useEffect(() => {
    // Check URL parameters for mode
    const urlParams = new URLSearchParams(location.search);
    const modeParam = urlParams.get('mode');
    
    if (modeParam && availableRoles.includes(modeParam)) {
      setCurrentMode(modeParam);
    } else if (primaryRole && availableRoles.includes(primaryRole)) {
      setCurrentMode(primaryRole);
    } else if (availableRoles.length > 0) {
      setCurrentMode(availableRoles[0]);
    }
  }, [location, availableRoles, primaryRole]);

  const handleModeChange = (newMode) => {
    setCurrentMode(newMode);
    // Update URL without page reload
    const newUrl = `${window.location.pathname}?mode=${newMode}`;
    window.history.pushState({}, '', newUrl);
  };

  if (!user || !userRoles) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  const renderDashboard = () => {
    console.log('🎯 UnifiedDashboard rendering mode:', currentMode);
    switch (currentMode) {
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
      default:
        console.log('🛒 Rendering default BuyerDashboard');
        return <BuyerDashboard />;
    }
  };

  return (
    <div style={styles.container}>
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
    borderRadius: '16px'
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
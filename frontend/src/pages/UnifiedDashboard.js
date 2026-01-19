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
    switch (currentMode) {
      case 'buyer':
        return <BuyerDashboard />;
      case 'seller':
        return <SellerDashboard />;
      case 'rider':
        return <RiderDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <BuyerDashboard />;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.welcomeSection}>
          <h1>Welcome back, {user.full_name}!</h1>
          <p style={styles.subtitle}>
            You have access to {availableRoles.length} role{availableRoles.length !== 1 ? 's' : ''}: {availableRoles.join(', ')}
          </p>
        </div>
        
        <RoleSwitcher 
          currentMode={currentMode} 
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
    backgroundColor: '#f8f9fa'
  },
  header: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderBottom: '1px solid #e9ecef',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  welcomeSection: {
    marginBottom: '1rem'
  },
  subtitle: {
    color: '#666',
    fontSize: '1rem',
    margin: '0.5rem 0'
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
    color: '#666'
  }
};
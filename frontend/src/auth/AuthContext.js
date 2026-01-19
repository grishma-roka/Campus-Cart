import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const [userResponse, rolesResponse] = await Promise.all([
        axios.get('/auth/me'),
        axios.get('/roles/my-roles')
      ]);
      setUser(userResponse.data.user);
      setUserRoles(rolesResponse.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      // Fetch user roles after login
      try {
        const rolesResponse = await axios.get('/roles/my-roles');
        setUserRoles(rolesResponse.data);
      } catch (rolesError) {
        console.error('Failed to fetch roles:', rolesError);
      }
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setUserRoles(null);
  };

  const updateUserRole = (newRole) => {
    setUser(prev => ({ ...prev, role: newRole }));
  };

  const refreshRoles = async () => {
    try {
      const rolesResponse = await axios.get('/roles/my-roles');
      setUserRoles(rolesResponse.data);
    } catch (error) {
      console.error('Failed to refresh roles:', error);
    }
  };

  const becomeSeller = async () => {
    try {
      const response = await axios.post('/roles/become-seller');
      await refreshRoles();
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to become seller' 
      };
    }
  };

  const applyForRider = async (riderData) => {
    try {
      const response = await axios.post('/roles/apply-rider', riderData);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to apply for rider' 
      };
    }
  };

  const value = {
    user,
    userRoles,
    login,
    register,
    logout,
    updateUserRole,
    refreshRoles,
    becomeSeller,
    applyForRider,
    loading,
    isAuthenticated: !!user,
    // Role checks based on additive system
    isAdmin: userRoles?.is_admin || false,
    isSeller: userRoles?.is_seller || false,
    isBuyer: userRoles?.is_buyer || false,
    isRider: userRoles?.is_rider || false,
    // Available roles array
    availableRoles: userRoles?.available_roles || [],
    // Primary role
    primaryRole: userRoles?.primary_role || user?.role
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
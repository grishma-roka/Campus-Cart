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

  const normalizeUserInfo = (userObj) => {
    if (!userObj) return null;
    const isSellerCheck = !!userObj.is_seller || userObj.role?.toLowerCase() === 'seller';
    const isAdminCheck = !!userObj.is_admin || userObj.role?.toLowerCase() === 'admin';
    const isRiderCheck = !!userObj.is_rider || userObj.role?.toLowerCase() === 'rider';
    const isBuyerCheck = !!userObj.is_buyer || userObj.role?.toLowerCase() === 'buyer' || !userObj.role;
    
    return {
      ...userObj,
      is_seller: isSellerCheck ? 1 : userObj.is_seller,
      is_admin: isAdminCheck ? 1 : userObj.is_admin,
      is_rider: isRiderCheck ? 1 : userObj.is_rider,
      is_buyer: isBuyerCheck ? 1 : userObj.is_buyer
    };
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userResponse, rolesResponse] = await Promise.all([
          axios.get('/auth/me'),
          axios.get('/roles/my-roles')
        ]);
        setUser(normalizeUserInfo(userResponse.data.user));
        setUserRoles(rolesResponse.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line no-unused-vars
  const fetchUser = async () => {
    try {
      const [userResponse, rolesResponse] = await Promise.all([
        axios.get('/auth/me'),
        axios.get('/roles/my-roles')
      ]);
      setUser(normalizeUserInfo(userResponse.data.user));
      setUserRoles(rolesResponse.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      console.log('📡 API endpoint:', axios.defaults.baseURL + '/auth/login');
      
      const response = await axios.post('/auth/login', { email, password });
      console.log('✅ Login response received:', response.data);
      
      const { token, user: loggedInUser } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(normalizeUserInfo(loggedInUser));
      
      // Fetch user roles after login
      try {
        const rolesResponse = await axios.get('/roles/my-roles');
        setUserRoles(rolesResponse.data);
      } catch (rolesError) {
        console.error('Failed to fetch roles:', rolesError);
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Extract rider status if present
      const riderStatus = error.response?.data?.riderStatus;
      
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed',
        riderStatus: riderStatus
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      return { 
        success: true, 
        message: response.data.message,
        userId: response.data.userId,
        requiresRiderApplication: response.data.requiresRiderApplication
      };
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
    setUser(prev => normalizeUserInfo({ ...prev, role: newRole }));
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
      const isFormData = riderData instanceof FormData;
      const response = await axios.post('/roles/apply-rider', riderData, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
      });
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
    // Role checks based on additive system (DB flags)
    isAdmin: !!user?.is_admin || user?.role?.toLowerCase() === 'admin',
    isSeller: !!user?.is_seller || user?.role?.toLowerCase() === 'seller',
    isBuyer: !!user?.is_buyer || user?.role?.toLowerCase() === 'buyer',
    isRider: !!user?.is_rider || user?.role?.toLowerCase() === 'rider',
    // Available roles array (retained for backward compatibility if needed)
    availableRoles: userRoles?.available_roles || [],
    primaryRole: userRoles?.primary_role || user?.role
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
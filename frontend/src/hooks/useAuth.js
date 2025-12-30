import { useState, useEffect, useCallback } from 'react';
import { AuthApi } from '../services/api';

const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state kept for backward compatibility
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    primary_role: 'customer',
    vehicle_type: '',
    country: '',
    city: '',
    area: ''
  });
  const [authState, setAuthState] = useState('login');

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AuthApi.getCurrentUser();
      setCurrentUser(data);
      setError('');
    } catch (err) {
      console.error('fetchCurrentUser error:', err);
      // 401/403 are expected if not logged in
      if (err.statusCode === 401 || err.statusCode === 403) {
        setCurrentUser(null);
      } else if (err.status === 401 || err.status === 403) {
        setCurrentUser(null);
      } else {
        // For other errors, we might still be unauthenticated or implementation issue
        // But for safety in this hook, we assume null user if fetch fails
        setCurrentUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleLogin = useCallback(async (formData) => {
    if (!formData.email || !formData.password) {
      setError('Email and password required');
      return false;
    }

    setLoading(true);
    try {
      const response = await AuthApi.login(formData);
      setCurrentUser(response.user);

      setAuthForm({
        name: '', email: '', password: '', phone: '',
        primary_role: 'customer', vehicle_type: '',
        country: '', city: '', area: ''
      });
      setError('');
      return true;
    } catch (err) {
      setError(err.error || err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (formData) => {
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.country || !formData.city) {
      setError('All required fields must be filled');
      return false;
    }

    if (formData.primary_role === 'driver' && !formData.vehicle_type) {
      setError('Vehicle type is required for drivers');
      return false;
    }

    const payload = {
      ...formData,
      primary_role: formData.primary_role || 'customer'
    };

    setLoading(true);
    try {
      const response = await AuthApi.register(payload);
      setCurrentUser(response.user);

      setAuthForm({
        name: '', email: '', password: '', phone: '',
        primary_role: 'customer', vehicle_type: '',
        country: '', city: '', area: ''
      });
      setError('');
      return true;
    } catch (err) {
      setError(err.error || err.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthApi.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setCurrentUser(null);
      setAuthState('login');
      setError('');
    }
  }, []);

  // Legacy support 
  const updateUser = (userData) => {
    setCurrentUser(userData);
  };

  const resetForm = () => {
    setAuthForm({
      name: '', email: '', password: '', phone: '',
      primary_role: 'customer', vehicle_type: '',
      country: '', city: '', area: ''
    });
    setError('');
  };

  // Stub functions for compatibility if used elsewhere without full refactor
  const handleForgotPassword = useCallback(async () => { console.warn('Not implemented in this hook version'); return false; }, []);
  const handleResetPassword = useCallback(async () => { console.warn('Not implemented in this hook version'); return false; }, []);
  const handleSendEmailVerification = useCallback(async () => { console.warn('Not implemented in this hook version'); return false; }, []);
  const handleVerifyEmail = useCallback(async () => { console.warn('Not implemented in this hook version'); return false; }, []);


  return {
    currentUser,
    isAuthenticated: !!currentUser,
    authForm,
    setAuthForm,
    authState,
    setAuthState,
    loading,
    error,
    setError,
    fetchCurrentUser,
    handleLogin,
    handleRegister,
    handleForgotPassword,
    handleResetPassword,
    handleSendEmailVerification,
    handleVerifyEmail,
    logout,
    updateUser,
    resetForm,
    token: 'cookie'
  };
};

export default useAuth;

import { useState, useEffect, useCallback } from 'react';

const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    setIsAuthenticated(!!token);
  }, [token]);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
          return;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const data = await response.json();
      setCurrentUser(data);
      setError('');
    } catch (err) {
      console.error('fetchCurrentUser error:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('500')) {
        setError('Connection issue: Failed to get user data. Please try refreshing the page.');
      } else {
        logout();
      }
    }
  }, [token, API_URL]);

  const handleLogin = useCallback(async (formData) => {
    if (!formData.email || !formData.password) {
      setError('Email and password required');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setAuthForm({ name: '', email: '', password: '', phone: '', primary_role: 'customer', vehicle_type: '', country: '', city: '', area: '' });
      setError('');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const handleRegister = useCallback(async (formData) => {
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.country || !formData.city) {
      setError('All required fields must be filled');
      return false;
    }

    if (formData.primary_role === 'driver' && !formData.vehicle_type) {
      setError('Vehicle type is required for drivers');
      return false;
    }

    // Ensure primary_role is set for backend
    const payload = {
      ...formData,
      primary_role: formData.primary_role || formData.primary_role
    };

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setAuthForm({ name: '', email: '', password: '', phone: '', primary_role: 'customer', vehicle_type: '', country: '', city: '', area: '' });
      setError('');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const login = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setCurrentUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setAuthState('login');
    setError('');
  }, []);

  const updateUser = (userData) => {
    setCurrentUser(userData);
  };

  const handleForgotPassword = useCallback(async (email, recaptchaToken) => {
    if (!email) {
      setError('Email is required');
      return false;
    }

    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recaptchaToken })
      });

      setError('');
      return true;
    } catch (err) {
      setError('Failed to send password reset email. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const handleResetPassword = useCallback(async (token, newPassword) => {
    if (!token || !newPassword) {
      setError('Token and new password are required');
      return false;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      setError('');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const handleSendEmailVerification = useCallback(async () => {
    if (!token) {
      setError('Authentication required');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send verification email');
      }

      setError('');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  const handleVerifyEmail = useCallback(async (verificationToken) => {
    if (!verificationToken) {
      setError('Verification token is required');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to verify email');
      }

      // Refresh user data
      await fetchCurrentUser();
      setError('');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL, fetchCurrentUser]);

  const resetForm = () => {
    setAuthForm({
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
    setError('');
  };

  return {
    token,
    currentUser,
    isAuthenticated,
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
    login,
    logout,
    updateUser,
    resetForm
  };
};

export default useAuth;

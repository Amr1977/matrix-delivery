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
    role: 'customer',
    vehicle_type: '',
    country: '',
    city: '',
    area: ''
  });
  const [authState, setAuthState] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

  useEffect(() => {
    setIsAuthenticated(!!token);
  }, [token]);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
      setAuthForm({ name: '', email: '', password: '', phone: '', role: 'customer', vehicle_type: '', country: '', city: '', area: '' });
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

    if (formData.role === 'driver' && !formData.vehicle_type) {
      setError('Vehicle type is required for drivers');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setAuthForm({ name: '', email: '', password: '', phone: '', role: 'customer', vehicle_type: '', country: '', city: '', area: '' });
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

  const resetForm = () => {
    setAuthForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'customer',
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
    login,
    logout,
    updateUser,
    resetForm
  };
};

export default useAuth;

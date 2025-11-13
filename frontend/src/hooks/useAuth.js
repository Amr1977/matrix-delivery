import { useState, useEffect } from 'react';

const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  useEffect(() => {
    setIsAuthenticated(!!token);
  }, [token]);

  const login = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setCurrentUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  const updateUser = (userData) => {
    setCurrentUser(userData);
  };

  return {
    token,
    currentUser,
    isAuthenticated,
    login,
    logout,
    updateUser
  };
};

export default useAuth;

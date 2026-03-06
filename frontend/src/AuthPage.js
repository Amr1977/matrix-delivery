import React from 'react';
import { useLocation } from 'react-router-dom';
import { MainApp } from './App';

const AuthPage = () => {
  const location = useLocation();
  return <MainApp authState={location.pathname.substring(1)} />;
};

export default AuthPage;

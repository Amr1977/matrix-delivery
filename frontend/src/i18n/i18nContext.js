import React, { createContext, useState, useContext, useEffect } from 'react';
import translations from './locales';

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    // Get saved locale from localStorage or default to 'en'
    return localStorage.getItem('locale') || 'en';
  });

  const [direction, setDirection] = useState('ltr');

  useEffect(() => {
    // Update direction based on locale
    const newDirection = locale === 'ar' ? 'rtl' : 'ltr';
    setDirection(newDirection);
    document.documentElement.dir = newDirection;
    document.documentElement.lang = locale;
    
    // Save to localStorage
    localStorage.setItem('locale', locale);
  }, [locale]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[locale];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  const changeLocale = (newLocale) => {
    if (translations[newLocale]) {
      setLocale(newLocale);
    }
  };

  return (
    <I18nContext.Provider value={{ locale, direction, t, changeLocale }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
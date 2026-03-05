import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { I18nProvider } from './i18n/i18nContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);


// Service Worker for push notifications
// We first unregister any existing SWs, then register our FCM SW
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        // Unregister all existing service workers first
        const unregisterPromises = registrations.map((registration) => {
            return registration.unregister();
        });
        
        Promise.all(unregisterPromises).then(() => {
            // After all are unregistered, register the new one
            return navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }).then((registration) => {
            console.log('Service Worker registered:', registration.scope);
        }).catch((err) => {
            console.error('Service Worker registration failed:', err);
        });
    }).catch((err) => {
        console.error('Failed to get service worker registrations:', err);
    });
}


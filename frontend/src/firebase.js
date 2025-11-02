// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Environment-specific Firebase configurations
const firebaseConfigs = {
  development: {
    apiKey: "AIzaSyDonXVaZajprJ6SHiRFbQY_rPf4ZrFhRbo",
    authDomain: "matrix-delivery-dev.firebaseapp.com",
    projectId: "matrix-delivery-dev",
    storageBucket: "matrix-delivery-dev.firebasestorage.app",
    messagingSenderId: "821695847521",
    appId: "1:821695847521:web:930d27360631e4ee041e20",
    measurementId: "G-NRPCK9YNS4"
  },
  staging: {
    apiKey: "AIzaSyCJN5RuTC_31mFadOsmT7WNZaejkjdTrhA",
    authDomain: "matrix-delivery-staging.firebaseapp.com",
    projectId: "matrix-delivery-staging",
    storageBucket: "matrix-delivery-staging.firebasestorage.app",
    messagingSenderId: "395768910783",
    appId: "1:395768910783:web:ce5368f53c2f4e7c5fc70a",
    measurementId: "G-E2P7LRW1Z9"
  },
  test: {
    apiKey: "AIzaSyDNTvXNL5uzWvuDzinJ3hlTiGvf6GK1YLg",
    authDomain: "matrix-delivery-test.firebaseapp.com",
    projectId: "matrix-delivery-test",
    storageBucket: "matrix-delivery-test.firebasestorage.app",
    messagingSenderId: "267773227239",
    appId: "1:267773227239:web:1d4bac5faa97d41b503242",
    measurementId: "G-VZ8S8NQDLX"
  },
  production: {
    apiKey: "AIzaSyCKLqK_x_Jvop7a5ht3w1nsnpa2hhx1bVk",
    authDomain: "matrix-delivery.firebaseapp.com",
    projectId: "matrix-delivery",
    storageBucket: "matrix-delivery.firebasestorage.app",
    messagingSenderId: "127557882021",
    appId: "1:127557882021:web:f515e53b8d66547d2efd4c",
    measurementId: "G-WE5CMMR9LB"
  }
};

// Determine environment (can be overridden by REACT_APP_ENV)
const getEnvironment = () => {
  // Check for explicit environment variable
  if (process.env.REACT_APP_ENV) {
    return process.env.REACT_APP_ENV;
  }

  // Fallback based on hostname or other indicators
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'development';
    }
    if (hostname.includes('staging')) {
      return 'staging';
    }
    if (hostname.includes('test') || hostname.includes('testing')) {
      return 'test';
    }
  }

  return 'production';
};

const environment = getEnvironment();
const firebaseConfig = firebaseConfigs[environment];

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (optional, only if you want analytics)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, analytics, environment };

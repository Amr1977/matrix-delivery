// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKLqK_x_Jvop7a5ht3w1nsnpa2hhx1bVk",
  authDomain: "matrix-delivery.firebaseapp.com",
  projectId: "matrix-delivery",
  storageBucket: "matrix-delivery.firebasestorage.app",
  messagingSenderId: "127557882021",
  appId: "1:127557882021:web:f515e53b8d66547d2efd4c",
  measurementId: "G-WE5CMMR9LB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (optional, only if you want analytics)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, analytics };

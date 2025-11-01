// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDinn2c3TmEEtVOl0s3jRhFSzdmFOjPncs",
  authDomain: "badr-delivery-dev.firebaseapp.com",
  projectId: "badr-delivery-dev",
  storageBucket: "badr-delivery-dev.firebasestorage.app",
  messagingSenderId: "563643637401",
  appId: "1:563643637401:web:bd05d7e7ff4558eedc2208",
  measurementId: "G-HTMH7MM0MT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (optional, only if you want analytics)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, analytics };

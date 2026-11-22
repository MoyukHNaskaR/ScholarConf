import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ScholarConf Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDhnqc3asFW-ow7k2H1ikzDw1hcSqZfNww",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "scholarconf-4a26d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "scholarconf-4a26d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "scholarconf-4a26d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "911201243186",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:911201243186:web:67bd9d651bbec9887c2c2b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TDHHBMWSYM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDhnqc3asFW-ow7k2H1ikzDw1hcSqZfNww",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "scholarconf-4a26d.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "scholarconf-4a26d",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "scholarconf-4a26d.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "911201243186",
  appId: process.env.FIREBASE_APP_ID || "1:911201243186:web:67bd9d651bbec9887c2c2b",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-TDHHBMWSYM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;

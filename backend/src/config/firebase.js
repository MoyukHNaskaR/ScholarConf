import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDhnqc3asFW-ow7k2H1ikzDw1hcSqZfNww",
  authDomain: "scholarconf-4a26d.firebaseapp.com",
  projectId: "scholarconf-4a26d",
  storageBucket: "scholarconf-4a26d.firebasestorage.app",
  messagingSenderId: "911201243186",
  appId: "1:911201243186:web:67bd9d651bbec9887c2c2b",
  measurementId: "G-TDHHBMWSYM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;

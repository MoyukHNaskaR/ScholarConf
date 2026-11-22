import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { sendVerificationEmail } from '../services/api';

/**
 * Register a new user with Firebase Auth and save role profile to Firestore.
 * Automatically dispatches the CMT verification email via the backend mailing service.
 */
export async function registerUser({ email, password, fullName, affiliation, role = 'author' }) {
  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Update display name in Firebase Auth
  await updateProfile(user, { displayName: fullName });

  // 3. Save profile & role in Firestore 'users' collection
  const userProfile = {
    uid: user.uid,
    email,
    fullName,
    affiliation: affiliation || 'Independent Researcher',
    role, // 'author' | 'reviewer' | 'chair'
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', user.uid), userProfile);

  // 4. Trigger automated CMT verification email
  try {
    await sendVerificationEmail(email, fullName, user.uid);
  } catch (err) {
    console.warn('Automated verification email dispatch note:', err.message);
  }

  return { user, profile: userProfile };
}

/**
 * Sign in existing user and fetch their Firestore profile (with role)
 */
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Fetch role and details from Firestore
  const docSnap = await getDoc(doc(db, 'users', user.uid));
  const profile = docSnap.exists() ? docSnap.data() : { role: 'author', fullName: user.displayName };

  return { user, profile };
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Fetch a user's Firestore profile
 */
export async function getUserProfile(uid) {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

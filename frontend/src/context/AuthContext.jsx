import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import {
  syncUserAccount,
  seedPrototypeData,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/api';

const AuthContext = createContext(null);

export const SUPER_ADMIN_EMAILS = [
  'admin@scholarconf.com',
  'superadmin@scholarconf.com',
];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Seed prototype sample data once on startup
  useEffect(() => {
    seedPrototypeData();
  }, []);

  // Listen to Firebase Auth session changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        try {
          const syncRes = await syncUserAccount({
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split('@')[0],
            photoURL: fbUser.photoURL || '',
            isNewUser: false,
          });
          setUserProfile(syncRes.profile);
        } catch {
          const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
          if (userSnap.exists()) {
            setUserProfile(userSnap.data());
          } else {
            const cleanEmail = (fbUser.email || '').toLowerCase();
            setUserProfile({
              uid: fbUser.uid,
              name: fbUser.displayName || cleanEmail.split('@')[0],
              email: cleanEmail,
              platformRole: SUPER_ADMIN_EMAILS.includes(cleanEmail)
                ? 'super_admin'
                : 'user',
            });
          }
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setNotifications([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener for user notifications
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const cleanEmail = (currentUser.email || '').toLowerCase();
    const notifRef = collection(db, 'notifications');
    const q = query(notifRef, where('userEmail', '==', cleanEmail));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setNotifications(items);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Email/Password Registration
  async function registerWithEmail({ name, email, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const syncRes = await syncUserAccount({
      uid: cred.user.uid,
      email: cred.user.email,
      name,
      photoURL: '',
      isNewUser: true,
    });
    setUserProfile(syncRes.profile);
    return cred.user;
  }

  // Email/Password Login
  async function loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const syncRes = await syncUserAccount({
      uid: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName || email.split('@')[0],
      photoURL: cred.user.photoURL || '',
      isNewUser: false,
    });
    setUserProfile(syncRes.profile);
    return cred.user;
  }

  // Google OAuth Sign-In
  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const isNew =
      cred.user.metadata.creationTime === cred.user.metadata.lastSignInTime;
    const syncRes = await syncUserAccount({
      uid: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName || cred.user.email?.split('@')[0],
      photoURL: cred.user.photoURL || '',
      isNewUser: isNew,
    });
    setUserProfile(syncRes.profile);
    return cred.user;
  }

  // Password Reset via Firebase Auth + Backend Log
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      await fetch(`${apiBase}/scholarconf/password-reset-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // non-blocking
    }
  }

  // Logout
  async function logout() {
    await signOut(auth);
  }

  // Mark individual notification as read
  async function markAsRead(notificationId) {
    await markNotificationRead(notificationId);
  }

  // Mark all unread notifications as read
  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsRead(unreadIds);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isSuperAdmin =
    userProfile?.platformRole === 'super_admin' ||
    SUPER_ADMIN_EMAILS.includes((currentUser?.email || '').toLowerCase());

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        authLoading,
        isSuperAdmin,
        notifications,
        unreadCount,
        registerWithEmail,
        loginWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

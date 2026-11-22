import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase.js';

export const SUPER_ADMIN_EMAILS = [
  'admin@scholarconf.com',
  'superadmin@scholarconf.com',
];

/**
 * Verify Firebase Auth ID token via Google Identity Toolkit or user headers
 */
export async function verifyAuthToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const clientUid = req.headers['x-user-uid'];
    const clientEmail = req.headers['x-user-email'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];

      // Verify token with Firebase Auth REST API
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.users && data.users.length > 0) {
          const fbUser = data.users[0];
          const userDoc = await getDoc(doc(db, 'users', fbUser.localId));
          const userData = userDoc.exists() ? userDoc.data() : {};

          req.user = {
            uid: fbUser.localId,
            email: fbUser.email,
            name: userData.name || fbUser.displayName || fbUser.email.split('@')[0],
            platformRole:
              SUPER_ADMIN_EMAILS.includes((fbUser.email || '').toLowerCase()) ||
              userData.platformRole === 'super_admin'
                ? 'super_admin'
                : 'user',
          };
          return next();
        }
      }
    }

    // Fallback check using uid lookup in Firestore if token verification passed uid header
    if (clientUid) {
      const userDoc = await getDoc(doc(db, 'users', clientUid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        req.user = {
          uid: clientUid,
          email: userData.email || clientEmail,
          name: userData.name || 'ScholarConf User',
          platformRole:
            SUPER_ADMIN_EMAILS.includes((userData.email || '').toLowerCase()) ||
            userData.platformRole === 'super_admin'
              ? 'super_admin'
              : 'user',
        };
        return next();
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Valid Firebase authentication required.' });
  } catch (error) {
    console.error('Auth verification error:', error.message);
    return res.status(401).json({ error: 'Authentication verification failed.' });
  }
}

/**
 * Middleware: Require Super Admin privileges
 */
export function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.platformRole !== 'super_admin') {
    return res.status(403).json({
      error: 'Forbidden: Super Admin access is restricted to authorized admin accounts.',
    });
  }
  next();
}

/**
 * Helper: Get a user's single role in a specific conference
 */
export async function getUserConferenceRole(conferenceId, userId, userEmail) {
  const membersRef = collection(db, 'conferenceMembers');
  const qByUid = query(
    membersRef,
    where('conferenceId', '==', conferenceId),
    where('userId', '==', userId)
  );
  const snapUid = await getDocs(qByUid);
  if (!snapUid.empty) {
    return snapUid.docs[0].data().role;
  }

  if (userEmail) {
    const qByEmail = query(
      membersRef,
      where('conferenceId', '==', conferenceId),
      where('email', '==', userEmail.toLowerCase())
    );
    const snapEmail = await getDocs(qByEmail);
    if (!snapEmail.empty) {
      return snapEmail.docs[0].data().role;
    }
  }

  return null;
}

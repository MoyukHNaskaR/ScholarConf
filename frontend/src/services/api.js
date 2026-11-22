import { auth, db } from '../firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Helper: Build authenticated headers with Firebase ID Token
 */
async function getAuthHeaders() {
  const user = auth.currentUser;
  const headers = { 'Content-Type': 'application/json' };
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-user-uid'] = user.uid;
      headers['x-user-email'] = user.email || '';
    } catch (e) {
      headers['x-user-uid'] = user.uid;
      headers['x-user-email'] = user.email || '';
    }
  }
  return headers;
}

/**
 * Seed initial prototype sample data if database is empty
 */
export async function seedPrototypeData() {
  try {
    const res = await fetch(`${API_BASE}/scholarconf/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err) {
    console.warn('Seed check note:', err.message);
    return { seeded: false };
  }
}

/**
 * Sync user profile on login/registration and link any pending reviewer invitations
 */
export async function syncUserAccount({ uid, email, name, photoURL, isNewUser }) {
  const res = await fetch(`${API_BASE}/scholarconf/users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, email, name, photoURL, isNewUser }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to sync user account');
  return data;
}

/**
 * Create a Conference Request (Pending Super Admin Approval)
 */
export async function createConferenceRequest(payload) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/scholarconf/conference-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit conference request');
  return data;
}

/**
 * Super Admin Approve or Reject Conference Request
 */
export async function decideConferenceRequest(requestId, decision) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/scholarconf/conference-requests/${requestId}/decision`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ decision }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update conference request');
  return data;
}

/**
 * Super Admin Archive Conference
 */
export async function archiveConference(conferenceId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/scholarconf/conferences/${conferenceId}/archive`, {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to archive conference');
  return data;
}

/**
 * Chair Add New Track to Conference
 */
export async function addConferenceTrack(conferenceId, trackName) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/scholarconf/conferences/${conferenceId}/tracks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ trackName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add track');
  return data;
}

/**
 * Submit a New Paper (Author)
 */
export async function submitNewPaper(payload) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/scholarconf/papers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit paper');
  return data;
}

/**
 * Assign Multiple Reviewers to a Paper (Chair)
 */
export async function assignReviewersToPaper(paperId, reviewers) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/scholarconf/papers/${paperId}/assign-reviewers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reviewers }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to assign reviewers');
  return data;
}

/**
 * Submit or Save Draft Peer Review (Reviewer)
 */
export async function submitPeerReview(payload) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/scholarconf/reviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit review');
  return data;
}

/**
 * Chair Make Final Decision (Accepted / Rejected)
 */
export async function makePaperFinalDecision(paperId, decision) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/scholarconf/papers/${paperId}/decision`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ decision }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to record final decision');
  return data;
}

/**
 * Automatically determine a user's existing role in a given conference (Section 4 & 5)
 * Returns 'Chair' | 'Reviewer' | 'Author' (defaults to 'Author' if no existing role)
 */
export async function resolveUserConferenceRole(conferenceId, user) {
  if (!user) return 'Author';
  const cleanEmail = (user.email || '').toLowerCase();

  // 1. Check conference record directly for chairId / chairEmail
  const confSnap = await getDoc(doc(db, 'conferences', conferenceId));
  if (confSnap.exists()) {
    const conf = confSnap.data();
    if (conf.chairId === user.uid || (conf.chairEmail && conf.chairEmail.toLowerCase() === cleanEmail)) {
      return 'Chair';
    }
  }

  // 2. Check conferenceMembers by uid
  const membersRef = collection(db, 'conferenceMembers');
  const qUid = query(
    membersRef,
    where('conferenceId', '==', conferenceId),
    where('userId', '==', user.uid)
  );
  const snapUid = await getDocs(qUid);
  if (!snapUid.empty) {
    return snapUid.docs[0].data().role;
  }

  // 3. Check conferenceMembers by email
  if (cleanEmail) {
    const qEmail = query(
      membersRef,
      where('conferenceId', '==', conferenceId),
      where('email', '==', cleanEmail)
    );
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return snapEmail.docs[0].data().role;
    }
  }

  // 4. Check if user is an assigned reviewer on any paper in this conference
  const papersRef = collection(db, 'papers');
  const qRev = query(
    papersRef,
    where('conferenceId', '==', conferenceId),
    where('assignedReviewerEmails', 'array-contains', cleanEmail)
  );
  const snapRev = await getDocs(qRev);
  if (!snapRev.empty) {
    return 'Reviewer';
  }

  // 5. Default role if no existing membership -> Author
  return 'Author';
}

/**
 * Mark a notification as read in Firestore
 */
export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
}

/**
 * Mark multiple notifications as read
 */
export async function markAllNotificationsRead(notificationIds) {
  await Promise.all(
    notificationIds.map((id) =>
      updateDoc(doc(db, 'notifications', id), { isRead: true })
    )
  );
}

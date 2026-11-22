import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from './config';
import { sendReviewerInvite, sendCoAuthorInvite } from '../services/api';

/**
 * Submit a Paper to Firestore and dispatch co-author confirmation emails
 */
export async function submitPaper({
  title,
  abstract,
  track,
  primaryAuthorEmail,
  primaryAuthorName,
  coAuthorEmail,
  coAuthorName,
  conferenceName = 'ScholarConf 2026',
}) {
  const paperData = {
    title,
    abstract,
    track,
    conferenceName,
    primaryAuthorEmail,
    primaryAuthorName,
    coAuthors: coAuthorEmail ? [{ email: coAuthorEmail, name: coAuthorName, confirmed: false }] : [],
    status: 'submitted', // 'submitted' | 'under_review' | 'accepted' | 'rejected'
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'submissions'), paperData);

  // If a co-author was specified, dispatch the automated co-author invite email
  if (coAuthorEmail) {
    try {
      await sendCoAuthorInvite({
        email: coAuthorEmail,
        coAuthorName: coAuthorName || 'Colleague',
        primaryAuthorName,
        paperTitle: title,
        paperId: docRef.id,
        conferenceName,
      });
    } catch (err) {
      console.warn('Co-author invite email dispatch note:', err.message);
    }
  }

  return { id: docRef.id, ...paperData };
}

/**
 * Fetch all submissions (or filtered by author)
 */
export async function getSubmissions(authorEmail = null) {
  try {
    let q = collection(db, 'submissions');
    if (authorEmail) {
      q = query(collection(db, 'submissions'), where('primaryAuthorEmail', '==', authorEmail));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Error fetching submissions from Firestore:', err);
    return [];
  }
}

/**
 * Send and track a Reviewer Invitation in Firestore & dispatch email
 */
export async function inviteReviewer({
  email,
  reviewerName,
  conferenceName,
  trackName,
  reviewDeadline,
  chairName,
}) {
  // 1. Record invitation in Firestore
  const inviteRecord = {
    email,
    reviewerName,
    conferenceName,
    trackName,
    reviewDeadline,
    chairName,
    status: 'pending', // 'pending' | 'accepted' | 'declined'
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'invitations'), inviteRecord);

  // 2. Dispatch automated email via backend
  const emailResult = await sendReviewerInvite({
    email,
    reviewerName,
    conferenceName,
    trackName,
    reviewDeadline,
    chairName,
    inviteId: docRef.id,
  });

  return { id: docRef.id, ...inviteRecord, emailResult };
}

/**
 * Fetch all invitations
 */
export async function getInvitations() {
  try {
    const snapshot = await getDocs(collection(db, 'invitations'));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Error fetching invitations from Firestore:', err);
    return [];
  }
}

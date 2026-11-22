import express from 'express';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import {
  verifyAuthToken,
  requireSuperAdmin,
  getUserConferenceRole,
  SUPER_ADMIN_EMAILS,
} from '../middleware/authMiddleware.js';
import {
  sendWelcomeEmail,
  sendConferenceRequestReceivedEmail,
  sendConferenceApprovedEmail,
  sendConferenceRejectedEmail,
  sendPaperSubmittedAuthorEmail,
  sendPaperSubmittedChairEmail,
  sendReviewerAssignedEmail,
  sendReviewerInvitationUnregisteredEmail,
  sendReviewCompletedChairEmail,
  sendPaperStatusUpdatedEmail,
  sendPaperFinalDecisionEmail,
  sendPasswordResetNoticeEmail,
} from '../services/emailService.js';

const router = express.Router();

/**
 * Helper: Create an In-App Notification in Firestore
 */
async function createNotification({
  userId,
  userEmail,
  conferenceId = null,
  paperId = null,
  targetRoute = '/dashboard',
  title,
  message,
}) {
  try {
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
      notificationId: notifRef.id,
      userId: userId || null,
      userEmail: userEmail ? userEmail.toLowerCase() : null,
      conferenceId,
      paperId,
      targetRoute,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    return notifRef.id;
  } catch (err) {
    console.warn('Notification creation warning:', err.message);
    return null;
  }
}

/**
 * 1. User Sync & Registration Hook (Workflow A & Workflow H)
 * - Syncs user profile in Firestore
 * - Sends Welcome email if newly registered
 * - Associates any pending reviewer invitations matching user's email!
 */
router.post('/users/sync', async (req, res) => {
  try {
    const { uid, email, name, photoURL, isNewUser } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'uid and email are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(cleanEmail);

    const userRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(userRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;

    const platformRole =
      isSuperAdmin || existingData?.platformRole === 'super_admin'
        ? 'super_admin'
        : 'user';

    const userProfile = {
      uid,
      name: name || existingData?.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      photoURL: photoURL || existingData?.photoURL || '',
      platformRole,
      createdAt: existingData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, userProfile, { merge: true });

    // Send Welcome email if brand new registration
    if (isNewUser || !existingSnap.exists()) {
      await sendWelcomeEmail({ email: cleanEmail, name: userProfile.name });
      await createNotification({
        userId: uid,
        userEmail: cleanEmail,
        targetRoute: '/dashboard',
        title: 'Welcome to ScholarConf!',
        message: 'Your academic account is active. Explore upcoming conferences or submit research.',
      });
    }

    // Workflow H: Check pending reviewerInvitations for this email and associate account!
    const invQ = query(
      collection(db, 'reviewerInvitations'),
      where('reviewerEmail', '==', cleanEmail),
      where('status', '==', 'Pending')
    );
    const invSnap = await getDocs(invQ);
    const associatedInvites = [];

    for (const invDoc of invSnap.docs) {
      const inv = invDoc.data();
      // Check if user already has a conflicting role in that conference
      const existingRole = await getUserConferenceRole(inv.conferenceId, uid, cleanEmail);

      if (!existingRole || existingRole === 'Reviewer') {
        // Ensure conferenceMembers record exists
        if (!existingRole) {
          const memberId = `${inv.conferenceId}_${uid}`;
          await setDoc(doc(db, 'conferenceMembers', memberId), {
            membershipId: memberId,
            conferenceId: inv.conferenceId,
            userId: uid,
            role: 'Reviewer',
            name: userProfile.name,
            email: cleanEmail,
            status: 'Active',
            joinedAt: new Date().toISOString(),
          });
        }

        // Update the paper's assignedReviewers entry with user's uid
        if (inv.paperId) {
          const paperRef = doc(db, 'papers', inv.paperId);
          const paperSnap = await getDoc(paperRef);
          if (paperSnap.exists()) {
            const pData = paperSnap.data();
            const updatedReviewers = (pData.assignedReviewers || []).map((r) =>
              r.email?.toLowerCase() === cleanEmail
                ? { ...r, uid, name: r.name || userProfile.name, status: r.status === 'Invited' ? 'Pending Review' : r.status }
                : r
            );
            const reviewerEmails = Array.from(
              new Set([...(pData.assignedReviewerEmails || []), cleanEmail])
            );
            const reviewerIds = Array.from(
              new Set([...(pData.assignedReviewerIds || []), uid])
            );

            await updateDoc(paperRef, {
              assignedReviewers: updatedReviewers,
              assignedReviewerEmails: reviewerEmails,
              assignedReviewerIds: reviewerIds,
            });
          }
        }

        await updateDoc(doc(db, 'reviewerInvitations', invDoc.id), {
          status: 'Accepted',
          reviewerId: uid,
          acceptedAt: new Date().toISOString(),
        });

        // Notify Reviewer & Chair
        await createNotification({
          userId: uid,
          userEmail: cleanEmail,
          conferenceId: inv.conferenceId,
          paperId: inv.paperId,
          targetRoute: `/conference/${inv.conferenceId}/reviewer`,
          title: 'Paper Assigned for Review',
          message: `Your invited assignment for "${inv.paperTitle}" in ${inv.conferenceName} is now linked to your account.`,
        });

        // Notify Conference Chair
        const confSnap = await getDoc(doc(db, 'conferences', inv.conferenceId));
        if (confSnap.exists()) {
          const conf = confSnap.data();
          await createNotification({
            userId: conf.chairId,
            userEmail: conf.chairEmail,
            conferenceId: inv.conferenceId,
            paperId: inv.paperId,
            targetRoute: `/conference/${inv.conferenceId}/chair`,
            title: 'Invited Reviewer Registered',
            message: `${userProfile.name} (${cleanEmail}) registered and accepted the review assignment for ${inv.paperTitle}.`,
          });
        }

        associatedInvites.push(invDoc.id);
      }
    }

    res.json({
      success: true,
      profile: userProfile,
      associatedInvitesCount: associatedInvites.length,
    });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. Submit Conference Creation Request (Workflow B)
 */
router.post('/conference-requests', verifyAuthToken, async (req, res) => {
  try {
    const {
      organizationName,
      organizationSlug,
      chairName,
      conferenceName,
      description,
      tracks,
      startDate,
      endDate,
      submissionDeadline,
      reviewDeadline,
    } = req.body;

    if (!organizationName || !organizationSlug || !chairName) {
      return res.status(400).json({
        error: 'Organization Name, Organization Slug, and Chair Name are required.',
      });
    }

    const validTracks = (Array.isArray(tracks) ? tracks : [tracks])
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean);

    if (validTracks.length === 0) {
      return res.status(400).json({ error: 'At least one conference track is required.' });
    }

    const reqRef = doc(collection(db, 'conferenceRequests'));
    const fullConfName =
      conferenceName?.trim() ||
      `${organizationSlug.toUpperCase()} 2026: ${organizationName} Annual Conference`;

    const requestRecord = {
      requestId: reqRef.id,
      conferenceName: fullConfName,
      requestedBy: req.user.uid,
      requesterEmail: req.user.email.toLowerCase(),
      organizationName: organizationName.trim(),
      organizationSlug: organizationSlug.trim().toLowerCase(),
      chairName: chairName.trim(),
      tracks: validTracks,
      description:
        description?.trim() ||
        `Premier international academic conference organized by ${organizationName.trim()} featuring peer-reviewed tracks in ${validTracks.join(', ')}.`,
      startDate: startDate || 'Dec 18, 2026',
      endDate: endDate || 'Dec 21, 2026',
      submissionDeadline: submissionDeadline || 'Nov 30, 2026',
      reviewDeadline: reviewDeadline || 'Dec 15, 2026',
      status: 'Pending Approval',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    };

    await setDoc(reqRef, requestRecord);

    // Notify Super Admins in-app
    const adminQ = query(collection(db, 'users'), where('platformRole', '==', 'super_admin'));
    const adminSnap = await getDocs(adminQ);
    for (const adminDoc of adminSnap.docs) {
      await createNotification({
        userId: adminDoc.id,
        userEmail: adminDoc.data().email,
        targetRoute: '/super-admin',
        title: 'New Conference Creation Request',
        message: `${chairName} (${organizationName}) submitted a request for "${fullConfName}".`,
      });
    }
    // Also create notification for default super admin email
    await createNotification({
      userEmail: 'admin@scholarconf.com',
      targetRoute: '/super-admin',
      title: 'New Conference Creation Request',
      message: `${chairName} (${organizationName}) submitted a request for "${fullConfName}".`,
    });

    // Notify requester via Email
    await sendConferenceRequestReceivedEmail({
      email: req.user.email,
      chairName,
      conferenceName: fullConfName,
      organizationName,
      tracks: validTracks,
    });

    res.json({
      success: true,
      request: requestRecord,
      message: 'Conference creation request submitted for Super Admin approval.',
    });
  } catch (error) {
    console.error('Create conference request error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. Super Admin Approve or Reject Conference Request (Workflow B)
 * Enforces Sole Chair rule via Firestore Transaction.
 */
router.post(
  '/conference-requests/:requestId/decision',
  verifyAuthToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { decision } = req.body; // 'Approved' | 'Rejected'

      if (!['Approved', 'Rejected'].includes(decision)) {
        return res.status(400).json({ error: 'Decision must be Approved or Rejected.' });
      }

      const reqRef = doc(db, 'conferenceRequests', requestId);
      const reqSnap = await getDoc(reqRef);

      if (!reqSnap.exists()) {
        return res.status(404).json({ error: 'Conference request not found.' });
      }

      const reqData = reqSnap.data();

      if (decision === 'Approved') {
        const confRef = doc(collection(db, 'conferences'));
        const memberId = `${confRef.id}_${reqData.requestedBy}`;
        const memberRef = doc(db, 'conferenceMembers', memberId);

        const newConference = {
          conferenceId: confRef.id,
          name: reqData.conferenceName || `${reqData.organizationSlug.toUpperCase()} 2026`,
          organizationName: reqData.organizationName,
          organizationSlug: reqData.organizationSlug,
          chairId: reqData.requestedBy,
          chairName: reqData.chairName,
          chairEmail: reqData.requesterEmail,
          tracks: reqData.tracks || ['General Track'],
          description:
            reqData.description ||
            `International research conference hosted by ${reqData.organizationName}.`,
          startDate: reqData.startDate || 'Dec 18, 2026',
          endDate: reqData.endDate || 'Dec 21, 2026',
          submissionDeadline: reqData.submissionDeadline || 'Nov 30, 2026',
          reviewDeadline: reqData.reviewDeadline || 'Dec 15, 2026',
          status: 'Approved',
          requestId: requestId,
          createdAt: new Date().toISOString(),
        };

        await runTransaction(db, async (transaction) => {
          transaction.update(reqRef, {
            status: 'Approved',
            conferenceId: confRef.id,
            reviewedAt: new Date().toISOString(),
            reviewedBy: req.user.uid,
          });
          transaction.set(confRef, newConference);
          transaction.set(memberRef, {
            membershipId: memberId,
            conferenceId: confRef.id,
            userId: reqData.requestedBy,
            role: 'Chair',
            name: reqData.chairName,
            email: (reqData.requesterEmail || '').toLowerCase(),
            status: 'Active',
            joinedAt: new Date().toISOString(),
          });
        });

        // Send in-app notification & email to Chair
        await createNotification({
          userId: reqData.requestedBy,
          userEmail: reqData.requesterEmail,
          conferenceId: confRef.id,
          targetRoute: `/conference/${confRef.id}/chair`,
          title: 'Conference Request Approved!',
          message: `Your conference "${newConference.name}" has been approved and activated. You are assigned as Program Chair.`,
        });

        await sendConferenceApprovedEmail({
          email: reqData.requesterEmail,
          chairName: reqData.chairName,
          conferenceName: newConference.name,
          organizationName: reqData.organizationName,
          conferenceId: confRef.id,
        });

        return res.json({
          success: true,
          status: 'Approved',
          conference: newConference,
        });
      } else {
        // Rejected
        await updateDoc(reqRef, {
          status: 'Rejected',
          reviewedAt: new Date().toISOString(),
          reviewedBy: req.user.uid,
        });

        await createNotification({
          userId: reqData.requestedBy,
          userEmail: reqData.requesterEmail,
          targetRoute: '/dashboard',
          title: 'Conference Request Rejected',
          message: `Your conference request for "${reqData.conferenceName || reqData.organizationName}" was not approved.`,
        });

        await sendConferenceRejectedEmail({
          email: reqData.requesterEmail,
          chairName: reqData.chairName,
          conferenceName: reqData.conferenceName,
          organizationName: reqData.organizationName,
        });

        return res.json({
          success: true,
          status: 'Rejected',
        });
      }
    } catch (error) {
      console.error('Conference approval error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * 4. Add Track to Conference (Chair Only)
 */
router.post('/conferences/:conferenceId/tracks', verifyAuthToken, async (req, res) => {
  try {
    const { conferenceId } = req.params;
    const { trackName } = req.body;
    if (!trackName || !trackName.trim()) {
      return res.status(400).json({ error: 'Track name is required.' });
    }

    const confRef = doc(db, 'conferences', conferenceId);
    const confSnap = await getDoc(confRef);
    if (!confSnap.exists()) {
      return res.status(404).json({ error: 'Conference not found.' });
    }

    const conf = confSnap.data();
    const userRole = await getUserConferenceRole(conferenceId, req.user.uid, req.user.email);
    if (conf.chairId !== req.user.uid && userRole !== 'Chair' && req.user.platformRole !== 'super_admin') {
      return res.status(403).json({ error: 'Only the Conference Chair can add tracks.' });
    }

    const updatedTracks = Array.from(new Set([...(conf.tracks || []), trackName.trim()]));
    await updateDoc(confRef, { tracks: updatedTracks });

    res.json({ success: true, tracks: updatedTracks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 5. Submit New Paper (Workflow C)
 * Enforces strict One-Role-Per-User-Per-Conference rule!
 * A Chair or Reviewer of this conference CANNOT submit a paper as Author.
 */
router.post('/papers', verifyAuthToken, async (req, res) => {
  try {
    const {
      conferenceId,
      title,
      track,
      abstract,
      authors,
      manuscriptURL,
      manuscriptFileName,
    } = req.body;

    if (!conferenceId || !title || !track || !abstract) {
      return res.status(400).json({
        error: 'Conference, Paper Title, Track, and Abstract are required.',
      });
    }

    // Validate abstract max 300 words
    const wordCount = abstract.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 300) {
      return res.status(400).json({
        error: `Abstract cannot exceed 300 words (currently ${wordCount} words).`,
      });
    }

    const confRef = doc(db, 'conferences', conferenceId);
    const confSnap = await getDoc(confRef);
    if (!confSnap.exists()) {
      return res.status(404).json({ error: 'Conference not found.' });
    }
    const conf = confSnap.data();

    // STRICT ROLE RESTRICTION CHECK:
    // Check if current user is already Chair or Reviewer in this conference
    const existingRole = await getUserConferenceRole(conferenceId, req.user.uid, req.user.email);
    if (existingRole && existingRole !== 'Author') {
      return res.status(403).json({
        error: `Role Restriction: You already hold the "${existingRole}" role in ${conf.name}. A user can have only one role per conference and cannot also be an Author.`,
      });
    }

    // Also check all listed co-authors to ensure the Chair or a Reviewer isn't added as an Author
    const cleanAuthors = Array.isArray(authors) && authors.length > 0
      ? authors.filter((a) => a.name && a.email)
      : [{ name: req.user.name, email: req.user.email }];

    for (const coAuthor of cleanAuthors) {
      const caEmail = coAuthor.email.toLowerCase().trim();
      if (conf.chairEmail && caEmail === conf.chairEmail.toLowerCase()) {
        return res.status(403).json({
          error: `Role Restriction: ${coAuthor.name} (${caEmail}) is the Program Chair of this conference and cannot be an Author.`,
        });
      }
      const caRole = await getUserConferenceRole(conferenceId, '', caEmail);
      if (caRole && caRole !== 'Author') {
        return res.status(403).json({
          error: `Role Restriction: ${coAuthor.name} (${caEmail}) is already a ${caRole} in this conference and cannot be listed as an Author.`,
        });
      }
    }

    // Generate unique Paper ID (e.g. #1425)
    const randomNum = Math.floor(1400 + Math.random() * 8500);
    const paperDisplayId = `#${randomNum}`;
    const paperRef = doc(collection(db, 'papers'));

    const paperRecord = {
      paperId: paperRef.id,
      paperNumber: paperDisplayId,
      conferenceId,
      conferenceName: conf.name,
      title: title.trim(),
      track: track.trim(),
      abstract: abstract.trim(),
      authors: cleanAuthors.map((a) => ({
        name: a.name.trim(),
        email: a.email.toLowerCase().trim(),
      })),
      authorEmails: cleanAuthors.map((a) => a.email.toLowerCase().trim()),
      submittedBy: req.user.uid,
      submitterName: req.user.name,
      submitterEmail: req.user.email.toLowerCase(),
      manuscriptURL: manuscriptURL || '',
      manuscriptFileName: manuscriptFileName || 'manuscript.pdf',
      assignedReviewers: [],
      assignedReviewerIds: [],
      assignedReviewerEmails: [],
      submissionStatus: 'Submitted',
      reviewStatus: 'Reviewer to be Assigned',
      finalDecision: null,
      reviewDeadline: conf.reviewDeadline || 'Dec 15, 2026',
      submittedAt: new Date().toISOString(),
    };

    // Save Paper & Author Membership in Firestore
    const memberId = `${conferenceId}_${req.user.uid}`;
    await setDoc(paperRef, paperRecord);
    await setDoc(doc(db, 'conferenceMembers', memberId), {
      membershipId: memberId,
      conferenceId,
      userId: req.user.uid,
      role: 'Author',
      name: req.user.name,
      email: req.user.email.toLowerCase(),
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });

    // Notify Author (In-app + Email)
    await createNotification({
      userId: req.user.uid,
      userEmail: req.user.email,
      conferenceId,
      paperId: paperRef.id,
      targetRoute: `/conference/${conferenceId}/author`,
      title: 'Paper Successfully Submitted',
      message: `Your manuscript "${paperDisplayId} - ${title}" has been submitted to ${conf.name}.`,
    });

    await sendPaperSubmittedAuthorEmail({
      email: req.user.email,
      authorName: req.user.name,
      paperId: paperDisplayId,
      paperTitle: title,
      conferenceName: conf.name,
      track,
      conferenceId,
    });

    // Notify Conference Chair (In-app + Email)
    await createNotification({
      userId: conf.chairId,
      userEmail: conf.chairEmail,
      conferenceId,
      paperId: paperRef.id,
      targetRoute: `/conference/${conferenceId}/chair`,
      title: 'New Paper Submitted',
      message: `${paperDisplayId} - "${title}" was submitted by ${cleanAuthors.map((a) => a.name).join(', ')}.`,
    });

    if (conf.chairEmail) {
      await sendPaperSubmittedChairEmail({
        email: conf.chairEmail,
        chairName: conf.chairName,
        paperId: paperDisplayId,
        paperTitle: title,
        authorNames: cleanAuthors.map((a) => a.name).join(', '),
        conferenceName: conf.name,
        track,
        conferenceId,
      });
    }

    res.json({
      success: true,
      paper: paperRecord,
      message: `Manuscript ${paperDisplayId} submitted successfully!`,
    });
  } catch (error) {
    console.error('Submit paper error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 6. Assign Multiple Reviewers to a Paper (Workflow D & Workflow H)
 * Enforces strict One-Role-Per-User-Per-Conference rule!
 * A Chair or Author in this conference CANNOT be assigned as a Reviewer.
 */
router.post('/papers/:paperId/assign-reviewers', verifyAuthToken, async (req, res) => {
  try {
    const { paperId } = req.params;
    const { reviewers } = req.body; // [{ name, email }]

    if (!Array.isArray(reviewers) || reviewers.length === 0) {
      return res.status(400).json({ error: 'Please specify at least one reviewer to assign.' });
    }

    const paperRef = doc(db, 'papers', paperId);
    const paperSnap = await getDoc(paperRef);
    if (!paperSnap.exists()) {
      return res.status(404).json({ error: 'Paper not found.' });
    }
    const paper = paperSnap.data();

    const confRef = doc(db, 'conferences', paper.conferenceId);
    const confSnap = await getDoc(confRef);
    const conf = confSnap.exists() ? confSnap.data() : { name: paper.conferenceName };

    // Verify caller is Chair of this conference
    const callerRole = await getUserConferenceRole(paper.conferenceId, req.user.uid, req.user.email);
    if (conf.chairId !== req.user.uid && callerRole !== 'Chair' && req.user.platformRole !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden: Only the Conference Chair can assign reviewers.',
      });
    }

    const existingAssigned = paper.assignedReviewers || [];
    const newAssignedList = [...existingAssigned];
    const assignedEmailsSet = new Set(existingAssigned.map((r) => r.email.toLowerCase()));
    const assignedIdsSet = new Set(paper.assignedReviewerIds || []);

    const resultsLog = [];

    for (const rev of reviewers) {
      const revName = (rev.name || '').trim();
      const revEmail = (rev.email || '').toLowerCase().trim();
      if (!revName || !revEmail) continue;

      // 1. Check Chair conflict
      if (conf.chairEmail && revEmail === conf.chairEmail.toLowerCase()) {
        return res.status(400).json({
          error: `Role Restriction: ${revName} (${revEmail}) is the Program Chair of this conference and cannot be a Reviewer.`,
        });
      }

      // 2. Check Paper Author conflict
      if ((paper.authorEmails || []).includes(revEmail)) {
        return res.status(400).json({
          error: `Role Restriction: ${revName} (${revEmail}) is an Author on this paper and cannot review it.`,
        });
      }

      // 3. Check if user has an existing ScholarConf account
      const userQ = query(collection(db, 'users'), where('email', '==', revEmail));
      const userSnap = await getDocs(userQ);
      const registeredUser = !userSnap.empty ? userSnap.docs[0].data() : null;

      // 4. Check existing conference role in conferenceMembers
      const existingMemberRole = await getUserConferenceRole(
        paper.conferenceId,
        registeredUser?.uid || '',
        revEmail
      );

      if (existingMemberRole && existingMemberRole !== 'Reviewer') {
        return res.status(400).json({
          error: `Role Restriction: ${revName} (${revEmail}) already holds the "${existingMemberRole}" role in ${conf.name}. A user can only hold one role per conference.`,
        });
      }

      // Skip if already assigned to this exact paper
      if (assignedEmailsSet.has(revEmail)) {
        continue;
      }

      if (registeredUser) {
        // Registered account exists! Assign immediately.
        const memberId = `${paper.conferenceId}_${registeredUser.uid}`;
        await setDoc(doc(db, 'conferenceMembers', memberId), {
          membershipId: memberId,
          conferenceId: paper.conferenceId,
          userId: registeredUser.uid,
          role: 'Reviewer',
          name: registeredUser.name || revName,
          email: revEmail,
          status: 'Active',
          joinedAt: new Date().toISOString(),
        });

        newAssignedList.push({
          uid: registeredUser.uid,
          name: registeredUser.name || revName,
          email: revEmail,
          status: 'Pending Review',
          assignedAt: new Date().toISOString(),
        });
        assignedEmailsSet.add(revEmail);
        assignedIdsSet.add(registeredUser.uid);

        // Send in-app notification & email to registered reviewer
        await createNotification({
          userId: registeredUser.uid,
          userEmail: revEmail,
          conferenceId: paper.conferenceId,
          paperId: paper.paperId,
          targetRoute: `/conference/${paper.conferenceId}/reviewer`,
          title: 'New Paper Assigned for Review',
          message: `You have been assigned to review "${paper.paperNumber || paper.paperId} - ${paper.title}" in ${conf.name}.`,
        });

        await sendReviewerAssignedEmail({
          email: revEmail,
          reviewerName: registeredUser.name || revName,
          paperId: paper.paperNumber || paper.paperId,
          paperTitle: paper.title,
          conferenceName: conf.name,
          track: paper.track,
          reviewDeadline: paper.reviewDeadline || conf.reviewDeadline || 'Dec 15, 2026',
          conferenceId: paper.conferenceId,
        });

        resultsLog.push({ email: revEmail, type: 'assigned_registered' });
      } else {
        // No account exists -> Workflow H: Create pending reviewerInvitation & send invitation email!
        const invRef = doc(collection(db, 'reviewerInvitations'));
        await setDoc(invRef, {
          invitationId: invRef.id,
          conferenceId: paper.conferenceId,
          conferenceName: conf.name,
          paperId: paper.paperId,
          paperNumber: paper.paperNumber || paper.paperId,
          paperTitle: paper.title,
          reviewerName: revName,
          reviewerEmail: revEmail,
          invitedBy: req.user.uid,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        });

        // Also reserve their Reviewer role by email in conferenceMembers so they cannot acquire another role
        const pendingMemberId = `${paper.conferenceId}_email_${revEmail.replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'conferenceMembers', pendingMemberId), {
          membershipId: pendingMemberId,
          conferenceId: paper.conferenceId,
          userId: null,
          role: 'Reviewer',
          name: revName,
          email: revEmail,
          status: 'Invited',
          joinedAt: new Date().toISOString(),
        });

        newAssignedList.push({
          uid: null,
          name: revName,
          email: revEmail,
          status: 'Pending Review',
          isInvited: true,
          assignedAt: new Date().toISOString(),
        });
        assignedEmailsSet.add(revEmail);

        await sendReviewerInvitationUnregisteredEmail({
          reviewerEmail: revEmail,
          reviewerName: revName,
          paperId: paper.paperNumber || paper.paperId,
          paperTitle: paper.title,
          conferenceName: conf.name,
          track: paper.track,
          chairName: conf.chairName || req.user.name,
        });

        resultsLog.push({ email: revEmail, type: 'invited_unregistered' });
      }
    }

    // Automatic Paper Status Update:
    // Reviewers assigned, reviews pending -> 'Under Review'
    const newReviewStatus =
      paper.reviewStatus === 'Reviewed' ? 'Under Review' : 'Under Review';

    await updateDoc(paperRef, {
      assignedReviewers: newAssignedList,
      assignedReviewerEmails: Array.from(assignedEmailsSet),
      assignedReviewerIds: Array.from(assignedIdsSet),
      reviewStatus: newReviewStatus,
    });

    // Notify Author that paper was assigned to reviewers and moved to Under Review
    await createNotification({
      userId: paper.submittedBy,
      userEmail: paper.submitterEmail,
      conferenceId: paper.conferenceId,
      paperId: paper.paperId,
      targetRoute: `/conference/${paper.conferenceId}/author`,
      title: 'Paper Moved to Under Review',
      message: `Reviewers have been assigned to "${paper.paperNumber || paper.paperId} - ${paper.title}". Status is now Under Review.`,
    });

    await sendPaperStatusUpdatedEmail({
      email: paper.submitterEmail,
      authorName: paper.submitterName || 'Author',
      paperId: paper.paperNumber || paper.paperId,
      paperTitle: paper.title,
      conferenceName: conf.name,
      newStatus: 'Under Review',
      conferenceId: paper.conferenceId,
    });

    res.json({
      success: true,
      assignedReviewers: newAssignedList,
      reviewStatus: newReviewStatus,
      resultsLog,
      message: 'Reviewers assigned and notified successfully.',
    });
  } catch (error) {
    console.error('Assign reviewers error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 7. Submit or Save Draft Peer Review (Workflow E)
 */
router.post('/reviews', verifyAuthToken, async (req, res) => {
  try {
    const {
      paperId,
      comments,
      strengths,
      weaknesses,
      originalityRating,
      technicalQualityRating,
      presentationRating,
      overallRecommendation,
      status = 'Completed', // 'Draft' | 'Completed'
    } = req.body;

    if (!paperId) {
      return res.status(400).json({ error: 'paperId is required.' });
    }

    const paperRef = doc(db, 'papers', paperId);
    const paperSnap = await getDoc(paperRef);
    if (!paperSnap.exists()) {
      return res.status(404).json({ error: 'Paper not found.' });
    }
    const paper = paperSnap.data();

    // Verify reviewer is actually assigned to this paper
    const userEmail = req.user.email.toLowerCase();
    const isAssigned =
      (paper.assignedReviewerEmails || []).includes(userEmail) ||
      (paper.assignedReviewerIds || []).includes(req.user.uid) ||
      (paper.assignedReviewers || []).some(
        (r) => r.email?.toLowerCase() === userEmail || r.uid === req.user.uid
      );

    if (!isAssigned) {
      return res.status(403).json({
        error: 'Forbidden: You can only review papers explicitly assigned to you.',
      });
    }

    const reviewId = `${paperId}_${req.user.uid}`;
    const reviewRef = doc(db, 'reviews', reviewId);

    const reviewRecord = {
      reviewId,
      paperId,
      paperNumber: paper.paperNumber || paperId,
      paperTitle: paper.title,
      conferenceId: paper.conferenceId,
      conferenceName: paper.conferenceName,
      reviewerId: req.user.uid,
      reviewerName: req.user.name,
      reviewerEmail: userEmail,
      comments: comments || '',
      strengths: strengths || '',
      weaknesses: weaknesses || '',
      originalityRating: Number(originalityRating) || 4,
      technicalQualityRating: Number(technicalQualityRating) || 4,
      presentationRating: Number(presentationRating) || 4,
      overallRecommendation: overallRecommendation || 'Accept',
      status: status === 'Draft' ? 'In Progress' : 'Reviewed',
      submittedAt: new Date().toISOString(),
    };

    await setDoc(reviewRef, reviewRecord, { merge: true });

    // Update reviewer's individual status inside paper.assignedReviewers
    const updatedAssigned = (paper.assignedReviewers || []).map((r) => {
      if (r.email?.toLowerCase() === userEmail || r.uid === req.user.uid) {
        return {
          ...r,
          uid: req.user.uid,
          status: status === 'Draft' ? 'In Progress' : 'Reviewed',
          recommendation: overallRecommendation,
          score: (
            (Number(originalityRating || 4) +
              Number(technicalQualityRating || 4) +
              Number(presentationRating || 4)) /
            3
          ).toFixed(1),
        };
      }
      return r;
    });

    // Check if ALL assigned reviewers have completed their reviews
    const completedCount = updatedAssigned.filter((r) => r.status === 'Reviewed').length;
    const totalAssigned = updatedAssigned.length;
    const allCompleted = totalAssigned > 0 && completedCount === totalAssigned;

    const newPaperReviewStatus = allCompleted ? 'Reviewed' : 'Under Review';

    await updateDoc(paperRef, {
      assignedReviewers: updatedAssigned,
      reviewStatus: newPaperReviewStatus,
      completedReviewsCount: completedCount,
    });

    if (status !== 'Draft') {
      // Notify Reviewer in-app
      await createNotification({
        userId: req.user.uid,
        userEmail,
        conferenceId: paper.conferenceId,
        paperId: paper.paperId,
        targetRoute: `/conference/${paper.conferenceId}/reviewer`,
        title: 'Review Submitted Successfully',
        message: `Your evaluation for "${paper.paperNumber || paper.paperId} - ${paper.title}" has been recorded.`,
      });

      // Notify Chair in-app & via email
      const confSnap = await getDoc(doc(db, 'conferences', paper.conferenceId));
      const conf = confSnap.exists() ? confSnap.data() : {};

      if (conf.chairId || conf.chairEmail) {
        await createNotification({
          userId: conf.chairId,
          userEmail: conf.chairEmail,
          conferenceId: paper.conferenceId,
          paperId: paper.paperId,
          targetRoute: `/conference/${paper.conferenceId}/chair`,
          title: allCompleted
            ? `All Reviews Completed for ${paper.paperNumber}`
            : `Review Submitted for ${paper.paperNumber}`,
          message: `${req.user.name} submitted a review (${overallRecommendation}) for "${paper.title}" (${completedCount}/${totalAssigned} completed).`,
        });

        await sendReviewCompletedChairEmail({
          email: conf.chairEmail,
          chairName: conf.chairName || 'Program Chair',
          reviewerName: req.user.name,
          paperId: paper.paperNumber || paper.paperId,
          paperTitle: paper.title,
          conferenceName: paper.conferenceName,
          recommendation: overallRecommendation,
          completedCount,
          totalAssigned,
          conferenceId: paper.conferenceId,
        });
      }

      // If all reviews are completed, notify Author that Review Process is Completed
      if (allCompleted) {
        await createNotification({
          userId: paper.submittedBy,
          userEmail: paper.submitterEmail,
          conferenceId: paper.conferenceId,
          paperId: paper.paperId,
          targetRoute: `/conference/${paper.conferenceId}/author`,
          title: 'Peer Review Process Completed',
          message: `All assigned reviews for "${paper.paperNumber || paper.paperId} - ${paper.title}" are complete. Awaiting final Chair decision.`,
        });
      }
    }

    res.json({
      success: true,
      review: reviewRecord,
      paperReviewStatus: newPaperReviewStatus,
      completedCount,
      totalAssigned,
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 8. Chair Final Decision on Paper: Accept or Reject (Workflow F)
 */
router.post('/papers/:paperId/decision', verifyAuthToken, async (req, res) => {
  try {
    const { paperId } = req.params;
    const { decision } = req.body; // 'Accepted' | 'Rejected'

    if (!['Accepted', 'Rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be Accepted or Rejected.' });
    }

    const paperRef = doc(db, 'papers', paperId);
    const paperSnap = await getDoc(paperRef);
    if (!paperSnap.exists()) {
      return res.status(404).json({ error: 'Paper not found.' });
    }
    const paper = paperSnap.data();

    const confSnap = await getDoc(doc(db, 'conferences', paper.conferenceId));
    const conf = confSnap.exists() ? confSnap.data() : {};

    const callerRole = await getUserConferenceRole(paper.conferenceId, req.user.uid, req.user.email);
    if (conf.chairId !== req.user.uid && callerRole !== 'Chair' && req.user.platformRole !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden: Only the Conference Chair can make final acceptance decisions.',
      });
    }

    await updateDoc(paperRef, {
      finalDecision: decision,
      reviewStatus: 'Reviewed',
      decidedAt: new Date().toISOString(),
      decidedBy: req.user.uid,
    });

    // Fetch completed reviews to include anonymized feedback summary in Author's email
    const revQ = query(collection(db, 'reviews'), where('paperId', '==', paperId));
    const revSnap = await getDocs(revQ);
    const reviewsSummary = revSnap.docs
      .map(
        (d, idx) =>
          `Reviewer #${idx + 1} (${d.data().overallRecommendation}): ${d.data().comments || d.data().strengths || 'Evaluation submitted.'}`
      )
      .join('<br/>');

    // Notify Author in-app & via Email
    await createNotification({
      userId: paper.submittedBy,
      userEmail: paper.submitterEmail,
      conferenceId: paper.conferenceId,
      paperId: paper.paperId,
      targetRoute: `/conference/${paper.conferenceId}/author`,
      title: `Paper ${decision}: ${paper.paperNumber || paper.paperId}`,
      message: `The Program Chair has made a final decision on "${paper.title}": ${decision.toUpperCase()}.`,
    });

    await sendPaperFinalDecisionEmail({
      email: paper.submitterEmail,
      authorName: paper.submitterName || 'Author',
      paperId: paper.paperNumber || paper.paperId,
      paperTitle: paper.title,
      conferenceName: paper.conferenceName,
      decision,
      reviewsSummary,
      conferenceId: paper.conferenceId,
    });

    res.json({
      success: true,
      finalDecision: decision,
      message: `Paper ${paper.paperNumber || paper.paperId} marked as ${decision}. Author notified.`,
    });
  } catch (error) {
    console.error('Final decision error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 9. Archive Conference (Super Admin)
 */
router.post('/conferences/:conferenceId/archive', verifyAuthToken, requireSuperAdmin, async (req, res) => {
  try {
    const { conferenceId } = req.params;
    await updateDoc(doc(db, 'conferences', conferenceId), {
      status: 'Archived',
      archivedAt: new Date().toISOString(),
    });
    res.json({ success: true, status: 'Archived' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 10. Password Reset Email Log Hook
 */
router.post('/password-reset-notify', async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      await sendPasswordResetNoticeEmail({ email });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 11. Seed Prototype Sample Data (Section 17)
 * Populates sample conferences, pending requests, and sample papers if not yet seeded,
 * clearly marked with `isSample: true` to distinguish from actual user submissions.
 */
router.post('/seed', async (req, res) => {
  try {
    const confSnap = await getDocs(collection(db, 'conferences'));
    if (!confSnap.empty) {
      return res.json({
        success: true,
        seeded: false,
        message: 'Sample prototype data already exists in Firestore.',
      });
    }

    // 1. Seed Approved Sample Conferences
    const sampleConferences = [
      {
        conferenceId: 'conf_icml_2026',
        name: 'ICML 2026: International Conference on Machine Learning',
        organizationName: 'International Machine Learning Society (IMLS)',
        organizationSlug: 'icml-2026',
        chairId: 'sample_chair_icml',
        chairName: 'Prof. Cynthia Dwork',
        chairEmail: 'chair.icml@scholarconf.com',
        tracks: [
          'Machine Learning & AI',
          'Graph Representation Learning',
          'Deep Generative Models',
          'Reinforcement Learning',
        ],
        description:
          'The premier international gathering of researchers dedicated to advancing the theory and practice of machine learning and statistical artificial intelligence.',
        startDate: 'Jul 12, 2026',
        endDate: 'Jul 18, 2026',
        submissionDeadline: 'Nov 25, 2026',
        reviewDeadline: 'Dec 15, 2026',
        status: 'Approved',
        isSample: true,
        createdAt: '2026-10-12T10:00:00.000Z',
      },
      {
        conferenceId: 'conf_neurips_2026',
        name: 'NeurIPS 2026: Conference on Neural Information Processing Systems',
        organizationName: 'NeurIPS Foundation',
        organizationSlug: 'neurips-2026',
        chairId: 'sample_chair_neurips',
        chairName: 'Dr. Yann LeCun',
        chairEmail: 'chair.neurips@scholarconf.com',
        tracks: [
          'Neural & Cognitive Systems',
          'Deep Generative Models',
          'Foundation Models & Scaling',
          'Computer Vision',
        ],
        description:
          'Interdisciplinary conference fostering the exchange of research advances in neural information processing systems, biological and artificial computation.',
        startDate: 'Dec 06, 2026',
        endDate: 'Dec 12, 2026',
        submissionDeadline: 'Dec 01, 2026',
        reviewDeadline: 'Jan 10, 2027',
        status: 'Approved',
        isSample: true,
        createdAt: '2026-09-20T10:00:00.000Z',
      },
      {
        conferenceId: 'conf_chi_2026',
        name: 'CHI 2026: ACM Conference on Human Factors in Computing Systems',
        organizationName: 'ACM SIGCHI',
        organizationSlug: 'chi-2026',
        chairId: 'sample_chair_chi',
        chairName: 'Dr. Sarah Jenkins',
        chairEmail: 'chair.chi@scholarconf.com',
        tracks: [
          'Human-Computer Interaction',
          'Human-AI Interaction',
          'Interactive Systems & UX',
        ],
        description:
          'Flagship forum for Human-Computer Interaction, exploring design, usability, and interactive intelligent technologies.',
        startDate: 'May 08, 2026',
        endDate: 'May 14, 2026',
        submissionDeadline: 'Oct 15, 2026',
        reviewDeadline: 'Oct 24, 2026',
        status: 'Approved',
        isSample: true,
        createdAt: '2026-08-15T10:00:00.000Z',
      },
      {
        conferenceId: 'conf_kdd_2025',
        name: 'KDD 2025: ACM SIGKDD Conference on Knowledge Discovery and Data Mining',
        organizationName: 'ACM SIGKDD',
        organizationSlug: 'kdd-2025',
        chairId: 'sample_chair_kdd',
        chairName: 'Dr. Michael Jordan',
        chairEmail: 'chair.kdd@scholarconf.com',
        tracks: ['Data Science & Analytics', 'Trustworthy AI', 'Large-Scale Graph Mining'],
        description:
          'Leading forum bringing together researchers and practitioners from data science, data mining, knowledge discovery, and large-scale analytics.',
        startDate: 'Aug 10, 2025',
        endDate: 'Aug 14, 2025',
        submissionDeadline: 'Jun 30, 2025',
        reviewDeadline: 'Jul 18, 2025',
        status: 'Approved',
        isSample: true,
        createdAt: '2025-06-04T10:00:00.000Z',
      },
    ];

    for (const conf of sampleConferences) {
      await setDoc(doc(db, 'conferences', conf.conferenceId), conf);
    }

    // 2. Seed Pending Conference Requests for Super Admin Console
    const sampleRequests = [
      {
        requestId: 'req_icra_2026',
        conferenceName: 'ICRA 2026: International Conference on Robotics and Automation',
        requestedBy: 'sample_chair_icra',
        requesterEmail: 'hiroshi.tanaka@ieee-ras.org',
        organizationName: 'IEEE Robotics and Automation Society',
        organizationSlug: 'ieee-ras',
        chairName: 'Dr. Hiroshi Tanaka',
        tracks: ['Robotics & Intelligent Systems', 'Autonomous Manipulation', 'Robot Perception'],
        description: 'Flagship robotics and automation symposium hosted by IEEE RAS.',
        startDate: 'May 20, 2026',
        endDate: 'May 25, 2026',
        submissionDeadline: 'Nov 28, 2026',
        reviewDeadline: 'Dec 20, 2026',
        status: 'Pending Approval',
        isSample: true,
        submittedAt: '2026-11-14T09:30:00.000Z',
      },
      {
        requestId: 'req_cvpr_2026',
        conferenceName: 'CVPR 2026: IEEE/CVF Conference on Computer Vision and Pattern Recognition',
        requestedBy: 'sample_chair_cvpr',
        requesterEmail: 'kristen.grauman@cvf.org',
        organizationName: 'Computer Vision Foundation (CVF)',
        organizationSlug: 'cvpr-2026',
        chairName: 'Prof. Kristen Grauman',
        tracks: ['Computer Vision & Deep Learning', '3D Vision & Reconstruction', 'Multimodal Vision'],
        description: 'Annual computer vision and pattern recognition conference.',
        startDate: 'Jun 18, 2026',
        endDate: 'Jun 22, 2026',
        submissionDeadline: 'Nov 30, 2026',
        reviewDeadline: 'Dec 22, 2026',
        status: 'Pending Approval',
        isSample: true,
        submittedAt: '2026-11-12T14:15:00.000Z',
      },
    ];

    for (const reqItem of sampleRequests) {
      await setDoc(doc(db, 'conferenceRequests', reqItem.requestId), reqItem);
    }

    // 3. Seed Sample Papers across statuses
    const samplePapers = [
      {
        paperId: 'paper_1402',
        paperNumber: '#1402',
        conferenceId: 'conf_icml_2026',
        conferenceName: 'ICML 2026',
        title: 'Active Learning on Graph Neural Networks',
        track: 'Graph Representation Learning',
        abstract:
          'We propose an uncertainty-guided active learning framework for Graph Neural Networks that minimizes label query complexity over large-scale relational topologies.',
        authors: [
          { name: 'Li Wei', email: 'li.wei@stanford.edu' },
          { name: 'Sarah Jenkins', email: 'sarah.jenkins@mit.edu' },
          { name: 'David Kim', email: 'david.kim@berkeley.edu' },
        ],
        authorEmails: ['li.wei@stanford.edu', 'sarah.jenkins@mit.edu', 'david.kim@berkeley.edu'],
        submittedBy: 'sample_author_1',
        submitterName: 'Li Wei',
        submitterEmail: 'li.wei@stanford.edu',
        manuscriptURL: 'https://arxiv.org/pdf/1706.03762.pdf',
        manuscriptFileName: '1402_Active_Learning_GNN.pdf',
        assignedReviewers: [
          { uid: 'rev_1', name: 'Dr. Alan Turing', email: 'alan.turing@cam.ac.uk', status: 'Reviewed', recommendation: 'Accept', score: '4.5' },
          { uid: 'rev_2', name: 'Prof. Grace Hopper', email: 'grace.hopper@yale.edu', status: 'Pending Review' },
          { uid: 'rev_3', name: 'Dr. Yann LeCun', email: 'yann.lecun@nyu.edu', status: 'Pending Review' },
        ],
        assignedReviewerIds: ['rev_1', 'rev_2', 'rev_3'],
        assignedReviewerEmails: ['alan.turing@cam.ac.uk', 'grace.hopper@yale.edu', 'yann.lecun@nyu.edu'],
        submissionStatus: 'Submitted',
        reviewStatus: 'Under Review',
        finalDecision: null,
        reviewDeadline: 'Dec 15, 2026',
        isSample: true,
        submittedAt: '2026-10-12T12:00:00.000Z',
      },
      {
        paperId: 'paper_1405',
        paperNumber: '#1405',
        conferenceId: 'conf_icml_2026',
        conferenceName: 'ICML 2026',
        title: 'Diffusion Models for Peer Review Matching',
        track: 'Deep Generative Models',
        abstract:
          'We introduce a score-based generative formulation for multi-objective reviewer-paper assignment under topic affinity and institutional conflict constraints.',
        authors: [
          { name: 'Elena Rostova', email: 'elena.rostova@ethz.ch' },
          { name: 'Marcus Vance', email: 'marcus.vance@ox.ac.uk' },
        ],
        authorEmails: ['elena.rostova@ethz.ch', 'marcus.vance@ox.ac.uk'],
        submittedBy: 'sample_author_2',
        submitterName: 'Elena Rostova',
        submitterEmail: 'elena.rostova@ethz.ch',
        manuscriptURL: 'https://arxiv.org/pdf/2006.11239.pdf',
        manuscriptFileName: '1405_Diffusion_Peer_Review.pdf',
        assignedReviewers: [],
        assignedReviewerIds: [],
        assignedReviewerEmails: [],
        submissionStatus: 'Submitted',
        reviewStatus: 'Reviewer to be Assigned',
        finalDecision: null,
        reviewDeadline: 'Dec 15, 2026',
        isSample: true,
        submittedAt: '2026-10-18T15:30:00.000Z',
      },
      {
        paperId: 'paper_1408',
        paperNumber: '#1408',
        conferenceId: 'conf_icml_2026',
        conferenceName: 'ICML 2026',
        title: 'Scaling Laws for Multimodal Transformers',
        track: 'Machine Learning & AI',
        abstract:
          'An empirical investigation of compute-optimal scaling laws across joint vision-language transformer architectures under varying token mixtures.',
        authors: [
          { name: 'Omar Al-Fayed', email: 'omar@toronto.edu' },
          { name: 'Hiroshi Tanaka', email: 'hiroshi@tokyo.ac.jp' },
          { name: 'Emily Chen', email: 'emily.chen@cmu.edu' },
        ],
        authorEmails: ['omar@toronto.edu', 'hiroshi@tokyo.ac.jp', 'emily.chen@cmu.edu'],
        submittedBy: 'sample_author_3',
        submitterName: 'Omar Al-Fayed',
        submitterEmail: 'omar@toronto.edu',
        manuscriptURL: 'https://arxiv.org/pdf/2001.08361.pdf',
        manuscriptFileName: '1408_Scaling_Laws_Multimodal.pdf',
        assignedReviewers: [
          { uid: 'rev_4', name: 'Dr. Fei-Fei Li', email: 'feifei@stanford.edu', status: 'Reviewed', recommendation: 'Accept', score: '4.7' },
          { uid: 'rev_5', name: 'Dr. Andrew Ng', email: 'andrew@stanford.edu', status: 'Reviewed', recommendation: 'Weak Accept', score: '4.3' },
          { uid: 'rev_6', name: 'Dr. Yoshua Bengio', email: 'yoshua@mila.quebec', status: 'Reviewed', recommendation: 'Accept', score: '4.8' },
        ],
        assignedReviewerIds: ['rev_4', 'rev_5', 'rev_6'],
        assignedReviewerEmails: ['feifei@stanford.edu', 'andrew@stanford.edu', 'yoshua@mila.quebec'],
        submissionStatus: 'Submitted',
        reviewStatus: 'Reviewed',
        finalDecision: null,
        reviewDeadline: 'Dec 15, 2026',
        isSample: true,
        submittedAt: '2026-10-08T11:20:00.000Z',
      },
      {
        paperId: 'paper_1150',
        paperNumber: '#1150',
        conferenceId: 'conf_chi_2026',
        conferenceName: 'CHI 2026',
        title: 'Scalable Transformers for Multimodal Representation',
        track: 'Human-AI Interaction',
        abstract:
          'Evaluating human-centered interpretability in large multimodal representation models for collaborative academic workflows.',
        authors: [{ name: 'Jane Doe', email: 'jane.doe@university.edu' }],
        authorEmails: ['jane.doe@university.edu'],
        submittedBy: 'sample_author_4',
        submitterName: 'Jane Doe',
        submitterEmail: 'jane.doe@university.edu',
        manuscriptURL: 'https://arxiv.org/pdf/1706.03762.pdf',
        manuscriptFileName: '1150_Scalable_Transformers.pdf',
        assignedReviewers: [
          { uid: 'rev_1', name: 'Dr. Alan Turing', email: 'alan.turing@cam.ac.uk', status: 'Reviewed', recommendation: 'Accept', score: '4.6' },
        ],
        assignedReviewerIds: ['rev_1'],
        assignedReviewerEmails: ['alan.turing@cam.ac.uk'],
        submissionStatus: 'Submitted',
        reviewStatus: 'Reviewed',
        finalDecision: 'Accepted',
        reviewDeadline: 'Oct 24, 2026',
        isSample: true,
        submittedAt: '2026-08-15T10:00:00.000Z',
      },
    ];

    for (const p of samplePapers) {
      await setDoc(doc(db, 'papers', p.paperId), p);
    }

    // Seed sample completed review for #1408
    await setDoc(doc(db, 'reviews', 'paper_1408_rev_4'), {
      reviewId: 'paper_1408_rev_4',
      paperId: 'paper_1408',
      paperNumber: '#1408',
      paperTitle: 'Scaling Laws for Multimodal Transformers',
      conferenceId: 'conf_icml_2026',
      conferenceName: 'ICML 2026',
      reviewerId: 'rev_4',
      reviewerName: 'Dr. Fei-Fei Li',
      reviewerEmail: 'feifei@stanford.edu',
      comments: 'Rigorous scaling law derivations across both vision and language modalities with comprehensive ablation experiments.',
      strengths: 'Strong theoretical justification and large-scale empirical validation.',
      weaknesses: 'Minor formatting improvements needed in Appendix B.',
      originalityRating: 5,
      technicalQualityRating: 5,
      presentationRating: 4,
      overallRecommendation: 'Accept',
      status: 'Reviewed',
      isSample: true,
      submittedAt: '2026-11-05T10:00:00.000Z',
    });

    res.json({
      success: true,
      seeded: true,
      message: 'Sample prototype data seeded into Firebase Firestore.',
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

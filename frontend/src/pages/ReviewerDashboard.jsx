import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Filter, MoreHorizontal, FileText } from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { resolveUserConferenceRole } from '../services/api';
import Navbar from '../components/Navbar';
import SubmitReviewModal from '../components/SubmitReviewModal';

export default function ReviewerDashboard() {
  const { conferenceId } = useParams();
  const { currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [conference, setConference] = useState(null);
  const [assignedPapers, setAssignedPapers] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('All');

  const [activePaper, setActivePaper] = useState(null);
  const [readOnlyModal, setReadOnlyModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function loadConferenceAndVerifyRole() {
      if (!conferenceId) return;
      const snap = await getDoc(doc(db, 'conferences', conferenceId));
      if (snap.exists()) {
        setConference(snap.data());
      }
      if (currentUser && !isSuperAdmin) {
        const role = await resolveUserConferenceRole(conferenceId, currentUser);
        if (role === 'Chair') {
          navigate(`/conference/${conferenceId}/chair`, { replace: true });
        }
      }
    }
    loadConferenceAndVerifyRole();
  }, [conferenceId, currentUser, isSuperAdmin, navigate]);

  // Listen to papers in this conference assigned to the current reviewer
  useEffect(() => {
    if (!conferenceId || !currentUser) return;
    const cleanEmail = (currentUser.email || '').toLowerCase();

    const q = query(
      collection(db, 'papers'),
      where('conferenceId', '==', conferenceId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allConfPapers = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Filter strictly to papers assigned to this reviewer
      const myAssigned = allConfPapers.filter((p) => {
        const byEmail = (p.assignedReviewerEmails || []).includes(cleanEmail);
        const byUid = (p.assignedReviewerIds || []).includes(currentUser.uid);
        const byObj = (p.assignedReviewers || []).some(
          (r) =>
            r.email?.toLowerCase() === cleanEmail || r.uid === currentUser.uid
        );
        return byEmail || byUid || byObj;
      });

      setAssignedPapers(myAssigned);
    });

    return () => unsubscribe();
  }, [conferenceId, currentUser]);

  // Determine the current reviewer's specific review status on a paper
  function getMyReviewStatus(paper) {
    if (!currentUser) return 'Pending Review';
    const cleanEmail = (currentUser.email || '').toLowerCase();
    const entry = (paper.assignedReviewers || []).find(
      (r) => r.email?.toLowerCase() === cleanEmail || r.uid === currentUser.uid
    );
    return entry?.status || 'Pending Review';
  }

  const pendingList = assignedPapers.filter(
    (p) => getMyReviewStatus(p) !== 'Reviewed'
  );
  const completedList = assignedPapers.filter(
    (p) => getMyReviewStatus(p) === 'Reviewed'
  );

  const filteredPapers = assignedPapers.filter((p) => {
    const myStatus = getMyReviewStatus(p);
    if (activeTab === 'pending' && myStatus === 'Reviewed') return false;
    if (activeTab === 'completed' && myStatus !== 'Reviewed') return false;

    if (
      yearFilter !== 'All' &&
      !(p.conferenceName || '').includes(yearFilter) &&
      !(p.reviewDeadline || '').includes(yearFilter)
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (p.paperNumber || p.paperId || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.conferenceName || '').toLowerCase().includes(q) ||
        (p.track || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const upcomingDeadline =
    conference?.reviewDeadline ||
    assignedPapers[0]?.reviewDeadline ||
    'Dec 15, 2026';

  return (
    <div className="sc-page-bg">
      <Navbar roleLabel="Reviewer" />

      <main className="sc-console-container">
        {/* Console Title Row */}
        <div className="sc-console-header">
          <div>
            <h1 className="sc-console-title">Reviewer Console</h1>
            <p className="sc-console-subtitle">
              {conference ? `${conference.name} — ` : ''}
              Review assigned conference papers and submit your peer evaluations.
            </p>
          </div>
        </div>

        {feedback && <div className="sc-alert-success">{feedback}</div>}

        {/* 4 Summary Metric Cards */}
        <div className="sc-stats-grid">
          <div className="sc-stat-card">
            <div className="sc-stat-label">Assigned Papers</div>
            <div className="sc-stat-value">{assignedPapers.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Pending Review</div>
            <div className="sc-stat-value">{pendingList.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Completed Reviews</div>
            <div className="sc-stat-value">{completedList.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Upcoming Deadline</div>
            <div className="sc-stat-value" style={{ fontSize: '22px' }}>
              {upcomingDeadline}
            </div>
          </div>
        </div>

        {/* Tabs & Search/Filter Bar */}
        <div className="sc-toolbar-row">
          <div className="sc-pill-tabs">
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Assigned ({assignedPapers.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Review ({pendingList.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed ({completedList.length})
            </button>
          </div>

          <div className="sc-filter-controls">
            <div className="sc-table-search">
              <Search size={15} className="sc-search-icon" />
              <input
                type="text"
                placeholder="Search paper ID, title, conference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sc-filter-select-wrap">
              <Filter size={14} />
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="All">Filter by Year: All</option>
                <option value="2026">Filter by Year: 2026</option>
                <option value="2025">Filter by Year: 2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assigned Papers Table */}
        <div className="sc-table-card">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Paper ID &amp; Title</th>
                <th>Conference &amp; Track</th>
                <th>Review Deadline</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sc-table-empty">
                    No assigned papers found for your reviewer account in this conference.
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper) => {
                  const myStatus = getMyReviewStatus(paper);
                  return (
                    <tr key={paper.paperId || paper.id}>
                      <td>
                        <div className="sc-cell-primary">
                          {paper.paperNumber || paper.paperId} - {paper.title}
                        </div>
                        {paper.manuscriptURL && (
                          <a
                            href={paper.manuscriptURL}
                            target="_blank"
                            rel="noreferrer"
                            className="sc-inline-pdf-link"
                          >
                            <FileText size={12} /> Read Manuscript PDF
                          </a>
                        )}
                      </td>
                      <td>
                        <div className="sc-cell-primary">
                          {paper.conferenceName || conference?.name}
                        </div>
                        <div className="sc-cell-secondary">{paper.track}</div>
                      </td>
                      <td>{paper.reviewDeadline || upcomingDeadline}</td>
                      <td>
                        <span
                          className={`sc-badge ${
                            myStatus === 'Reviewed'
                              ? 'sc-badge-green'
                              : myStatus === 'In Progress'
                              ? 'sc-badge-blue'
                              : 'sc-badge-amber'
                          }`}
                        >
                          {myStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="sc-actions-cell">
                          {myStatus === 'Pending Review' ||
                          myStatus === 'Invited' ? (
                            <button
                              type="button"
                              className="sc-btn-navy-xs"
                              onClick={() => {
                                setReadOnlyModal(false);
                                setActivePaper(paper);
                              }}
                            >
                              Submit Review
                            </button>
                          ) : myStatus === 'In Progress' ? (
                            <button
                              type="button"
                              className="sc-btn-outline-xs"
                              onClick={() => {
                                setReadOnlyModal(false);
                                setActivePaper(paper);
                              }}
                            >
                              Continue Review
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="sc-btn-outline-xs"
                              onClick={() => {
                                setReadOnlyModal(true);
                                setActivePaper(paper);
                              }}
                            >
                              View Review
                            </button>
                          )}

                          <button
                            type="button"
                            className="sc-dots-btn"
                            onClick={() => {
                              setReadOnlyModal(myStatus === 'Reviewed');
                              setActivePaper(paper);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Structured Review Submission / View Modal */}
      {activePaper && (
        <SubmitReviewModal
          paper={activePaper}
          readOnly={readOnlyModal}
          onClose={() => setActivePaper(null)}
          onSubmitted={(res, statusType) => {
            setActivePaper(null);
            setFeedback(
              statusType === 'Draft'
                ? 'Review draft saved! Status updated to In Progress.'
                : 'Peer review submitted! The Program Chair has been notified via email and in-app notification.'
            );
          }}
        />
      )}
    </div>
  );
}

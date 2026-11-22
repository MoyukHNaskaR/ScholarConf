import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react';
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
import ViewReviewsModal from '../components/ViewReviewsModal';

export default function AuthorDashboard() {
  const { conferenceId } = useParams();
  const { currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [conference, setConference] = useState(null);
  const [myPapers, setMyPapers] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'submitted' | 'under_review' | 'accepted' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [viewingPaper, setViewingPaper] = useState(null);

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
        } else if (role === 'Reviewer') {
          navigate(`/conference/${conferenceId}/reviewer`, { replace: true });
        }
      }
    }
    loadConferenceAndVerifyRole();
  }, [conferenceId, currentUser, isSuperAdmin, navigate]);

  // Listen to papers submitted by (or co-authored by) this user in the selected conference
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

      // Filter strictly to papers belonging to this author
      const owned = allConfPapers.filter((p) => {
        return (
          p.submittedBy === currentUser.uid ||
          (p.submitterEmail || '').toLowerCase() === cleanEmail ||
          (p.authorEmails || []).includes(cleanEmail)
        );
      });

      owned.sort(
        (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
      );
      setMyPapers(owned);
    });

    return () => unsubscribe();
  }, [conferenceId, currentUser]);

  function getAuthorDisplayStatus(p) {
    if (p.finalDecision === 'Accepted') return 'Accepted';
    if (p.finalDecision === 'Rejected') return 'Rejected';
    if (p.reviewStatus === 'Under Review') return 'Under Review';
    if (p.reviewStatus === 'Reviewed') return 'Review Done';
    return 'Submitted';
  }

  const submittedOnlyList = myPapers.filter(
    (p) => !p.finalDecision && p.reviewStatus === 'Reviewer to be Assigned'
  );
  const underReviewList = myPapers.filter(
    (p) => !p.finalDecision && p.reviewStatus === 'Under Review'
  );
  const reviewDoneList = myPapers.filter(
    (p) => p.reviewStatus === 'Reviewed' || Boolean(p.finalDecision)
  );
  const acceptedList = myPapers.filter((p) => p.finalDecision === 'Accepted');
  const rejectedList = myPapers.filter((p) => p.finalDecision === 'Rejected');

  const filteredPapers = myPapers.filter((p) => {
    const disp = getAuthorDisplayStatus(p);
    if (activeTab === 'submitted' && disp !== 'Submitted') return false;
    if (activeTab === 'under_review' && disp !== 'Under Review') return false;
    if (activeTab === 'accepted' && disp !== 'Accepted') return false;
    if (activeTab === 'rejected' && disp !== 'Rejected') return false;

    if (
      yearFilter !== 'All' &&
      !(p.conferenceName || '').includes(yearFilter) &&
      !(p.submittedAt || '').includes(yearFilter)
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

  function formatDate(iso) {
    if (!iso) return 'Oct 12, 2026';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="sc-page-bg">
      <Navbar roleLabel="Author" />

      <main className="sc-console-container">
        {/* Console Title Row */}
        <div className="sc-console-header">
          <div>
            <h1 className="sc-console-title">Author Console</h1>
            <p className="sc-console-subtitle">
              {conference ? `${conference.name} — ` : ''}
              Submit new papers and track the status of your conference submissions.
            </p>
          </div>
          <div className="sc-console-actions">
            <Link
              to={`/conference/${conferenceId}/submit`}
              className="sc-btn-navy"
            >
              <Plus size={16} /> Submit New Paper
            </Link>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="sc-stats-grid">
          <div className="sc-stat-card">
            <div className="sc-stat-label">Total Submissions</div>
            <div className="sc-stat-value">{myPapers.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Submitted</div>
            <div className="sc-stat-value">{submittedOnlyList.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Under Review</div>
            <div className="sc-stat-value">{underReviewList.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Review Done</div>
            <div className="sc-stat-value">{reviewDoneList.length}</div>
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
              All Submissions ({myPapers.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${
                activeTab === 'submitted' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('submitted')}
            >
              Submitted ({submittedOnlyList.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${
                activeTab === 'under_review' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('under_review')}
            >
              Under Review ({underReviewList.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${
                activeTab === 'accepted' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('accepted')}
            >
              Accepted ({acceptedList.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${
                activeTab === 'rejected' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected ({rejectedList.length})
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

        {/* Author Papers Table */}
        <div className="sc-table-card">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Paper ID &amp; Title</th>
                <th>Conference &amp; Track</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sc-table-empty">
                    You have not submitted any papers to this conference yet. Click &ldquo;+ Submit New Paper&rdquo; above to get started.
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper) => {
                  const disp = getAuthorDisplayStatus(paper);
                  const isDone =
                    disp === 'Accepted' ||
                    disp === 'Rejected' ||
                    disp === 'Review Done';

                  return (
                    <tr key={paper.paperId || paper.id}>
                      <td>
                        <div className="sc-cell-primary">
                          {paper.paperNumber || paper.paperId} - {paper.title}
                        </div>
                      </td>
                      <td>
                        <div className="sc-cell-primary">
                          {paper.conferenceName || conference?.name}
                        </div>
                        <div className="sc-cell-secondary">{paper.track}</div>
                      </td>
                      <td>{formatDate(paper.submittedAt)}</td>
                      <td>
                        <div>
                          <span
                            className={`sc-badge ${
                              disp === 'Accepted'
                                ? 'sc-badge-green'
                                : disp === 'Rejected'
                                ? 'sc-badge-red'
                                : disp === 'Under Review' ||
                                  disp === 'Review Done'
                                ? 'sc-badge-blue'
                                : 'sc-badge-slate'
                            }`}
                          >
                            {disp}
                          </span>
                        </div>
                        {(disp === 'Accepted' || disp === 'Rejected') && (
                          <div className="sc-cell-substatus">Review Done</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="sc-actions-cell">
                          <button
                            type="button"
                            className="sc-btn-outline-xs"
                            onClick={() => setViewingPaper(paper)}
                          >
                            {isDone ? 'View Reviews' : 'View Submission'}
                          </button>
                          <button
                            type="button"
                            className="sc-dots-btn"
                            onClick={() => setViewingPaper(paper)}
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

      {/* View Submission & Anonymized Reviews Modal */}
      {viewingPaper && (
        <ViewReviewsModal
          paper={viewingPaper}
          isChair={false}
          onClose={() => setViewingPaper(null)}
        />
      )}
    </div>
  );
}

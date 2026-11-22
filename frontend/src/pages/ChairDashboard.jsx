import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  Filter,
  MoreHorizontal,
  UserPlus,
  Eye,
  X,
} from 'lucide-react';
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
import { addConferenceTrack, resolveUserConferenceRole } from '../services/api';
import Navbar from '../components/Navbar';
import AssignReviewerModal from '../components/AssignReviewerModal';
import ViewReviewsModal from '../components/ViewReviewsModal';

export default function ChairDashboard() {
  const { conferenceId } = useParams();
  const { currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [conference, setConference] = useState(null);
  const [papers, setPapers] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'under_review' | 'reviewed' | 'unassigned'
  const [searchQuery, setSearchQuery] = useState('');
  const [trackFilter, setTrackFilter] = useState('All');

  const [assigningPaper, setAssigningPaper] = useState(null);
  const [viewingPaper, setViewingPaper] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  // Verify user's role in this conference and load conference details
  useEffect(() => {
    async function loadConferenceAndCheckRole() {
      if (!conferenceId) return;
      const snap = await getDoc(doc(db, 'conferences', conferenceId));
      if (snap.exists()) {
        const cData = snap.data();
        setConference(cData);

        if (currentUser && !isSuperAdmin && !cData.isSample) {
          const role = await resolveUserConferenceRole(conferenceId, currentUser);
          if (role !== 'Chair') {
            navigate(`/conference/${conferenceId}/${role.toLowerCase()}`, {
              replace: true,
            });
          }
        }
      }
    }
    loadConferenceAndCheckRole();
  }, [conferenceId, currentUser, isSuperAdmin, navigate]);

  // Listen to papers for this conference (plus sample papers if viewing a sample conference)
  useEffect(() => {
    if (!conferenceId) return;
    const q = query(
      collection(db, 'papers'),
      where('conferenceId', '==', conferenceId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      list.sort(
        (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
      );
      setPapers(list);
    });

    return () => unsubscribe();
  }, [conferenceId]);

  const underReviewList = papers.filter((p) => p.reviewStatus === 'Under Review');
  const reviewedList = papers.filter((p) => p.reviewStatus === 'Reviewed');
  const unassignedList = papers.filter(
    (p) =>
      p.reviewStatus === 'Reviewer to be Assigned' ||
      !p.assignedReviewers ||
      p.assignedReviewers.length === 0
  );

  const filteredPapers = papers.filter((p) => {
    if (activeTab === 'under_review' && p.reviewStatus !== 'Under Review')
      return false;
    if (activeTab === 'reviewed' && p.reviewStatus !== 'Reviewed') return false;
    if (
      activeTab === 'unassigned' &&
      p.reviewStatus !== 'Reviewer to be Assigned' &&
      (p.assignedReviewers || []).length > 0
    )
      return false;

    if (trackFilter !== 'All' && p.track !== trackFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const authorStr = (p.authors || [])
        .map((a) => `${a.name} ${a.email}`)
        .join(' ')
        .toLowerCase();
      return (
        (p.paperNumber || p.paperId || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        authorStr.includes(q)
      );
    }
    return true;
  });

  async function handleAddTrack(e) {
    e.preventDefault();
    if (!newTrackName.trim()) return;
    try {
      const res = await addConferenceTrack(conferenceId, newTrackName.trim());
      setConference((prev) => ({ ...prev, tracks: res.tracks }));
      setNewTrackName('');
      setShowAddTrackModal(false);
      setFeedback(`Added new track "${newTrackName.trim()}" to ${conference?.name || 'conference'}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleExportReport() {
    const headers = ['Paper ID', 'Title', 'Track', 'Authors', 'Reviewers', 'Status', 'Final Decision'];
    const rows = filteredPapers.map((p) => [
      p.paperNumber || p.paperId,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.track || '').replace(/"/g, '""')}"`,
      `"${(p.authors || []).map((a) => a.name).join(', ')}"`,
      `"${(p.assignedReviewers || []).map((r) => r.name).join(', ')}"`,
      p.reviewStatus,
      p.finalDecision || 'Pending',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Chair_Report_${conferenceId}.csv`;
    a.click();
  }

  const allTracks = Array.from(
    new Set([
      ...(conference?.tracks || []),
      ...papers.map((p) => p.track).filter(Boolean),
    ])
  );

  return (
    <div className="sc-page-bg">
      <Navbar roleLabel="Chair" />

      <main className="sc-console-container">
        {/* Console Title Row */}
        <div className="sc-console-header">
          <div>
            <h1 className="sc-console-title">Chair Console</h1>
            <p className="sc-console-subtitle">
              {conference ? `${conference.name} — ` : ''}
              Manage conference paper submissions, track review progress, and assign reviewers.
            </p>
          </div>
          <div className="sc-console-actions">
            <button
              type="button"
              className="sc-btn-outline"
              onClick={() => setShowAddTrackModal(true)}
            >
              <Plus size={15} /> Add New Track
            </button>
            <button
              type="button"
              className="sc-btn-outline"
              onClick={handleExportReport}
            >
              <Download size={15} /> Export Report
            </button>
          </div>
        </div>

        {feedback && <div className="sc-alert-success">{feedback}</div>}
        {error && <div className="sc-alert-error">{error}</div>}

        {/* 4 Summary Metric Cards */}
        <div className="sc-stats-grid">
          <div className="sc-stat-card">
            <div className="sc-stat-label">Total Submitted Papers</div>
            <div className="sc-stat-value">{papers.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Under Review</div>
            <div className="sc-stat-value">{underReviewList.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Reviewed</div>
            <div className="sc-stat-value">{reviewedList.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Reviewer to be Assigned</div>
            <div className="sc-stat-value">{unassignedList.length}</div>
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
              All Papers ({papers.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'under_review' ? 'active' : ''}`}
              onClick={() => setActiveTab('under_review')}
            >
              Under Review ({underReviewList.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'reviewed' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviewed')}
            >
              Reviewed ({reviewedList.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'unassigned' ? 'active' : ''}`}
              onClick={() => setActiveTab('unassigned')}
            >
              Reviewer to be Assigned ({unassignedList.length})
            </button>
          </div>

          <div className="sc-filter-controls">
            <div className="sc-table-search">
              <Search size={15} className="sc-search-icon" />
              <input
                type="text"
                placeholder="Search paper ID, title, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sc-filter-select-wrap">
              <Filter size={14} />
              <select
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
              >
                <option value="All">Filter by Track: All</option>
                {allTracks.map((t, i) => (
                  <option key={i} value={t}>
                    Filter by Track: {t}
                  </option>
                ))}
              </select>
            </div>

            {unassignedList.length > 0 && (
              <button
                type="button"
                className="sc-btn-outline"
                onClick={() => setAssigningPaper(unassignedList[0])}
              >
                Assign Reviewers in Bulk
              </button>
            )}
          </div>
        </div>

        {/* Paper Table */}
        <div className="sc-table-card">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Paper ID &amp; Title</th>
                <th>Authors</th>
                <th>Assigned Reviewers</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sc-table-empty">
                    No submitted papers match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper) => {
                  const revs = paper.assignedReviewers || [];
                  const completedRevs = revs.filter(
                    (r) => r.status === 'Reviewed'
                  ).length;

                  return (
                    <tr key={paper.paperId || paper.id}>
                      <td>
                        <div className="sc-cell-primary">
                          {paper.paperNumber || paper.paperId} - {paper.title}
                        </div>
                        <div className="sc-cell-secondary">
                          Track: {paper.track}
                          {paper.isSample && ' • (Sample)'}
                        </div>
                      </td>

                      <td>
                        <div className="sc-cell-authors">
                          {(paper.authors || []).map((a) => a.name).join(', ')}
                        </div>
                      </td>

                      <td>
                        {revs.length === 0 ? (
                          <span className="sc-unassigned-text">
                            Unassigned (0/3)
                          </span>
                        ) : (
                          <div className="sc-cell-authors">
                            {revs.map((r) => r.name).join(', ')}
                          </div>
                        )}
                      </td>

                      <td>
                        <div>
                          <span
                            className={`sc-badge ${
                              paper.reviewStatus === 'Reviewed'
                                ? 'sc-badge-green'
                                : paper.reviewStatus === 'Under Review'
                                ? 'sc-badge-blue'
                                : 'sc-badge-amber'
                            }`}
                          >
                            {paper.reviewStatus || 'Reviewer to be Assigned'}
                          </span>
                        </div>
                        {revs.length > 0 && (
                          <div className="sc-cell-substatus">
                            {completedRevs}/{revs.length} Reviews Done
                            {paper.finalDecision &&
                              ` • Decision: ${paper.finalDecision}`}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="sc-actions-cell">
                          {revs.length === 0 ||
                          paper.reviewStatus === 'Reviewer to be Assigned' ? (
                            <button
                              type="button"
                              className="sc-btn-navy-xs"
                              onClick={() => setAssigningPaper(paper)}
                            >
                              Assign Reviewer
                            </button>
                          ) : paper.reviewStatus === 'Reviewed' ? (
                            <div className="sc-stacked-action">
                              <button
                                type="button"
                                className="sc-btn-outline-xs"
                                onClick={() => setViewingPaper(paper)}
                              >
                                Make Decision
                              </button>
                              <button
                                type="button"
                                className="sc-sublink-btn"
                                onClick={() => setViewingPaper(paper)}
                              >
                                View Reviews
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="sc-btn-outline-xs"
                              onClick={() => setViewingPaper(paper)}
                            >
                              View Progress
                            </button>
                          )}

                          <div className="sc-dots-wrap">
                            <button
                              type="button"
                              className="sc-dots-btn"
                              onClick={() =>
                                setOpenMenuId(
                                  openMenuId === paper.paperId
                                    ? null
                                    : paper.paperId
                                )
                              }
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {openMenuId === paper.paperId && (
                              <div className="sc-row-menu">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssigningPaper(paper);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <UserPlus size={14} /> Assign Reviewer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingPaper(paper);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Eye size={14} /> View Reviews &amp; Decision
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* Assign Reviewer Popup Modal */}
      {assigningPaper && (
        <AssignReviewerModal
          paper={assigningPaper}
          onClose={() => setAssigningPaper(null)}
          onAssigned={(res) => {
            setAssigningPaper(null);
            setFeedback(res.message || 'Reviewers assigned successfully!');
          }}
        />
      )}

      {/* View Reviews & Final Decision Modal */}
      {viewingPaper && (
        <ViewReviewsModal
          paper={viewingPaper}
          isChair={true}
          onClose={() => setViewingPaper(null)}
          onDecisionMade={(res) => {
            setViewingPaper(null);
            setFeedback(res.message || 'Final decision recorded and author notified.');
          }}
        />
      )}

      {/* Add New Track Modal */}
      {showAddTrackModal && (
        <div
          className="sc-modal-backdrop"
          onClick={() => setShowAddTrackModal(false)}
        >
          <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3 className="sc-modal-title">Add Conference Track</h3>
              <button
                type="button"
                className="sc-modal-close"
                onClick={() => setShowAddTrackModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddTrack} className="sc-modal-body">
              <div className="sc-form-group">
                <label className="sc-label">New Track Name</label>
                <input
                  type="text"
                  required
                  className="sc-input"
                  placeholder="e.g., Quantum Machine Learning"
                  value={newTrackName}
                  onChange={(e) => setNewTrackName(e.target.value)}
                />
              </div>
              <div className="sc-modal-footer">
                <button
                  type="button"
                  className="sc-btn-outline"
                  onClick={() => setShowAddTrackModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="sc-btn-navy">
                  Add Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

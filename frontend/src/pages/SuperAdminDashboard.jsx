import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  Filter,
  MoreHorizontal,
  X,
  Eye,
  Archive,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { decideConferenceRequest, archiveConference } from '../services/api';
import Navbar from '../components/Navbar';

export default function SuperAdminDashboard() {
  const [conferences, setConferences] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'archived'
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [processingId, setProcessingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const unsubConf = onSnapshot(collection(db, 'conferences'), (snap) => {
      setConferences(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubReq = onSnapshot(collection(db, 'conferenceRequests'), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubConf();
      unsubReq();
    };
  }, []);

  // Merge pending/rejected requests and approved/archived conferences into unified view
  const pendingRequests = requests.filter((r) => r.status === 'Pending Approval');
  const approvedConfs = conferences.filter((c) => c.status === 'Approved');
  const archivedConfs = conferences.filter((c) => c.status === 'Archived');

  const unifiedItems = [
    ...pendingRequests.map((r) => ({
      itemId: r.requestId || r.id,
      isRequest: true,
      name: r.conferenceName || `${(r.organizationSlug || '').toUpperCase()} 2026: ${r.organizationName}`,
      tracks: r.tracks || [],
      organizationName: r.organizationName,
      chairName: r.chairName,
      submittedDate: r.submittedAt,
      status: r.status,
      raw: r,
    })),
    ...conferences.map((c) => ({
      itemId: c.conferenceId || c.id,
      isRequest: false,
      name: c.name,
      tracks: c.tracks || [],
      organizationName: c.organizationName,
      chairName: c.chairName,
      submittedDate: c.createdAt,
      status: c.status || 'Approved',
      raw: c,
    })),
  ].sort((a, b) => new Date(b.submittedDate || 0) - new Date(a.submittedDate || 0));

  const uniqueOrgsCount = new Set(
    unifiedItems.map((i) => (i.organizationName || '').toLowerCase()).filter(Boolean)
  ).size;

  const filteredItems = unifiedItems.filter((item) => {
    if (activeTab === 'pending' && item.status !== 'Pending Approval') return false;
    if (activeTab === 'approved' && item.status !== 'Approved') return false;
    if (activeTab === 'archived' && item.status !== 'Archived') return false;

    if (yearFilter !== 'All' && !(item.name || '').includes(yearFilter) && !(item.submittedDate || '').includes(yearFilter)) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.organizationName || '').toLowerCase().includes(q) ||
        (item.chairName || '').toLowerCase().includes(q) ||
        item.tracks.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  async function handleDecision(requestId, decision) {
    setError(null);
    setFeedback(null);
    setProcessingId(requestId);
    try {
      await decideConferenceRequest(requestId, decision);
      setFeedback(
        decision === 'Approved'
          ? 'Conference request approved! Conference activated and Chair notified via email & in-app notification.'
          : 'Conference request rejected and requester notified.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleArchive(conferenceId) {
    setError(null);
    setFeedback(null);
    setProcessingId(conferenceId);
    try {
      await archiveConference(conferenceId);
      setFeedback('Conference archived successfully.');
      setOpenMenuId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  function handleExportCSV() {
    const headers = ['Conference Name', 'Organization', 'Chair', 'Status', 'Date'];
    const rows = filteredItems.map((i) => [
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${(i.organizationName || '').replace(/"/g, '""')}"`,
      `"${(i.chairName || '').replace(/"/g, '""')}"`,
      i.status,
      formatDate(i.submittedDate),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ScholarConf_Platform_Report.csv';
    a.click();
  }

  function formatDate(iso) {
    if (!iso) return 'Nov 14, 2026';
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
      <Navbar roleLabel="Super Admin" />

      <main className="sc-console-container">
        {/* Console Header Row */}
        <div className="sc-console-header">
          <div>
            <h1 className="sc-console-title">Super Admin Console</h1>
            <p className="sc-console-subtitle">
              Review new conference requests from organizations and oversee all platform conferences.
            </p>
          </div>
          <div className="sc-console-actions">
            <Link to="/create-conference" className="sc-btn-outline">
              <Plus size={15} /> Create Conference
            </Link>
            <button type="button" className="sc-btn-outline" onClick={handleExportCSV}>
              <Download size={15} /> Export Report
            </button>
          </div>
        </div>

        {feedback && <div className="sc-alert-success">{feedback}</div>}
        {error && <div className="sc-alert-error">{error}</div>}

        {/* 4 Summary Metric Cards */}
        <div className="sc-stats-grid">
          <div className="sc-stat-card">
            <div className="sc-stat-label">All Conferences</div>
            <div className="sc-stat-value">{unifiedItems.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Pending Requests</div>
            <div className="sc-stat-value">{pendingRequests.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Approved Conferences</div>
            <div className="sc-stat-value">{approvedConfs.length}</div>
          </div>
          <div className="sc-stat-card">
            <div className="sc-stat-label">Organizations</div>
            <div className="sc-stat-value">{uniqueOrgsCount}</div>
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
              All Conferences ({unifiedItems.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Requests ({pendingRequests.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => setActiveTab('approved')}
            >
              Approved Conferences ({approvedConfs.length})
            </button>
            <button
              type="button"
              className={`sc-pill-tab ${activeTab === 'archived' ? 'active' : ''}`}
              onClick={() => setActiveTab('archived')}
            >
              Archived ({archivedConfs.length})
            </button>
          </div>

          <div className="sc-filter-controls">
            <div className="sc-table-search">
              <Search size={15} className="sc-search-icon" />
              <input
                type="text"
                placeholder="Search conferences, acronyms, organizations..."
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

        {/* Conference Table */}
        <div className="sc-table-card">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Conference Name</th>
                <th>Organization &amp; Chair</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sc-table-empty">
                    No matching conference records found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.itemId}>
                    <td>
                      <div className="sc-cell-primary">{item.name}</div>
                      <div className="sc-cell-secondary">
                        Track: {item.tracks[0] || 'Main Track'}
                        {item.tracks.length > 1 && ` (+${item.tracks.length - 1} more)`}
                      </div>
                    </td>
                    <td>
                      <div className="sc-cell-primary">{item.organizationName}</div>
                      <div className="sc-cell-secondary">Chair: {item.chairName}</div>
                    </td>
                    <td>{formatDate(item.submittedDate)}</td>
                    <td>
                      <span
                        className={`sc-badge ${
                          item.status === 'Pending Approval'
                            ? 'sc-badge-amber'
                            : item.status === 'Approved'
                            ? 'sc-badge-green'
                            : item.status === 'Rejected'
                            ? 'sc-badge-red'
                            : 'sc-badge-slate'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="sc-actions-cell">
                        {item.status === 'Pending Approval' && (
                          <>
                            <button
                              type="button"
                              className="sc-btn-navy-xs"
                              disabled={processingId === item.itemId}
                              onClick={() => handleDecision(item.itemId, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="sc-btn-reject-xs"
                              disabled={processingId === item.itemId}
                              onClick={() => handleDecision(item.itemId, 'Rejected')}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <div className="sc-dots-wrap">
                          <button
                            type="button"
                            className="sc-dots-btn"
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === item.itemId ? null : item.itemId
                              )
                            }
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {openMenuId === item.itemId && (
                            <div className="sc-row-menu">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailsItem(item);
                                  setOpenMenuId(null);
                                }}
                              >
                                <Eye size={14} /> View Details
                              </button>
                              {!item.isRequest && item.status === 'Approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleArchive(item.itemId)}
                                >
                                  <Archive size={14} /> Archive Conference
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* View Conference Details Modal */}
      {detailsItem && (
        <div className="sc-modal-backdrop" onClick={() => setDetailsItem(null)}>
          <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <div>
                <h3 className="sc-modal-title">{detailsItem.name}</h3>
                <p className="sc-modal-subtitle">{detailsItem.organizationName}</p>
              </div>
              <button
                type="button"
                className="sc-modal-close"
                onClick={() => setDetailsItem(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="sc-modal-body">
              <div className="sc-paper-summary-box">
                <p><strong>Program Chair:</strong> {detailsItem.chairName}</p>
                <p><strong>Status:</strong> {detailsItem.status}</p>
                <p><strong>Submitted Date:</strong> {formatDate(detailsItem.submittedDate)}</p>
                <p><strong>Tracks:</strong> {detailsItem.tracks.join(', ')}</p>
                {detailsItem.raw?.description && (
                  <p><strong>Description:</strong> {detailsItem.raw.description}</p>
                )}
              </div>
              <div className="sc-modal-footer">
                <button
                  type="button"
                  className="sc-btn-outline"
                  onClick={() => setDetailsItem(null)}
                >
                  Close
                </button>
                {detailsItem.status === 'Pending Approval' && (
                  <>
                    <button
                      type="button"
                      className="sc-btn-reject"
                      onClick={() => {
                        handleDecision(detailsItem.itemId, 'Rejected');
                        setDetailsItem(null);
                      }}
                    >
                      Reject Request
                    </button>
                    <button
                      type="button"
                      className="sc-btn-navy"
                      onClick={() => {
                        handleDecision(detailsItem.itemId, 'Approved');
                        setDetailsItem(null);
                      }}
                    >
                      Approve &amp; Activate
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

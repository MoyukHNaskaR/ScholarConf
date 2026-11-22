import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Plus,
  LogOut,
  Calendar,
  Clock,
  User,
  Building2,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { resolveUserConferenceRole } from '../services/api';
import NotificationBell from '../components/NotificationBell';

export default function HomeDashboard() {
  const { currentUser, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [conferences, setConferences] = useState([]);
  const [userRolesMap, setUserRolesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [navigatingId, setNavigatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time listener for Approved active conferences
  useEffect(() => {
    const q = query(
      collection(db, 'conferences'),
      where('status', '==', 'Approved')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      list.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setConferences(list);
      setLoading(false);

      // Resolve current user's role badge for each conference automatically
      if (currentUser) {
        const roles = {};
        for (const conf of list) {
          const cid = conf.conferenceId || conf.id;
          roles[cid] = await resolveUserConferenceRole(cid, currentUser);
        }
        setUserRolesMap(roles);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Automatic Role-Based Navigation when clicking a conference (Section 4)
  async function handleSelectConference(conf) {
    const cid = conf.conferenceId || conf.id;
    setNavigatingId(cid);
    try {
      const role = await resolveUserConferenceRole(cid, currentUser);
      if (role === 'Chair') {
        navigate(`/conference/${cid}/chair`);
      } else if (role === 'Reviewer') {
        navigate(`/conference/${cid}/reviewer`);
      } else {
        navigate(`/conference/${cid}/author`);
      }
    } catch {
      navigate(`/conference/${cid}/author`);
    } finally {
      setNavigatingId(null);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const filteredConferences = conferences.filter((c) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(term) ||
      (c.organizationName || '').toLowerCase().includes(term) ||
      (c.chairName || '').toLowerCase().includes(term) ||
      (c.tracks || []).some((t) => t.toLowerCase().includes(term))
    );
  });

  return (
    <div className="sc-home-layout">
      {/* Left Sidebar matching Screenshot 7 */}
      <aside className="sc-sidebar">
        <div className="sc-sidebar-top">
          <Link to="/dashboard" className="sc-sidebar-brand">
            <div className="sc-sidebar-brand-icon">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="sc-sidebar-brand-title">ScholarConf</div>
              <div className="sc-sidebar-brand-sub">Conference Management</div>
            </div>
          </Link>

          <nav className="sc-sidebar-nav">
            <Link to="/dashboard" className="sc-sidebar-link active">
              <Search size={17} />
              <span>Browse Conferences</span>
            </Link>

            {isSuperAdmin && (
              <Link to="/super-admin" className="sc-sidebar-link">
                <Shield size={17} />
                <span>Super Admin Console</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="sc-sidebar-bottom">
          <button
            type="button"
            className="sc-sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="sc-home-content">
        {/* Top Navigation Bar */}
        <header className="sc-home-topbar">
          <div className="sc-home-topbar-left">
            <div className="sc-search-box">
              <Search size={16} className="sc-search-icon" />
              <input
                type="text"
                className="sc-search-input"
                placeholder="Search conferences, organizations, tracks, or chairs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="sc-home-topbar-right">
            <NotificationBell />
            <Link to="/create-conference" className="sc-btn-navy">
              <Plus size={16} />
              <span>Create Conference</span>
            </Link>
          </div>
        </header>

        {/* Main Body */}
        <main className="sc-home-main">
          <div className="sc-welcome-header">
            <h1 className="sc-welcome-title">
              Welcome to <span className="sc-brand-accent">ScholarConf!</span>
            </h1>
            <p className="sc-welcome-subtitle">
              Explore and participate in upcoming conferences.
            </p>
          </div>

          {loading ? (
            <div className="sc-loading-state">Loading active conferences...</div>
          ) : filteredConferences.length === 0 ? (
            <div className="sc-empty-state">
              <div className="sc-empty-icon-wrap">
                <GraduationCap size={48} strokeWidth={1.5} />
              </div>
              <h3>No conferences found</h3>
              <p>Check back later or create a new conference</p>
              <Link
                to="/create-conference"
                className="sc-btn-navy"
                style={{ marginTop: '14px' }}
              >
                <Plus size={16} /> Create Conference
              </Link>
            </div>
          ) : (
            <div className="sc-conf-cards-grid">
              {filteredConferences.map((conf) => {
                const cid = conf.conferenceId || conf.id;
                const detectedRole = userRolesMap[cid] || 'Author';
                return (
                  <div
                    key={cid}
                    className="sc-conf-card"
                    onClick={() => handleSelectConference(conf)}
                  >
                    <div className="sc-conf-card-top">
                      <div className="sc-conf-badges">
                        <span className="sc-badge sc-badge-green">
                          {conf.status || 'Active'}
                        </span>
                        {conf.isSample && (
                          <span className="sc-badge sc-badge-slate">
                            Sample Data
                          </span>
                        )}
                      </div>
                      <span className="sc-role-indicator">
                        Your Access: <strong>{detectedRole}</strong>
                      </span>
                    </div>

                    <h2 className="sc-conf-card-title">{conf.name}</h2>

                    <div className="sc-conf-org-row">
                      <Building2 size={14} />
                      <span>{conf.organizationName}</span>
                    </div>

                    <p className="sc-conf-desc">
                      {conf.description ||
                        `Academic research conference organized by ${conf.organizationName}.`}
                    </p>

                    {/* Tracks */}
                    <div className="sc-conf-tracks-wrap">
                      {(conf.tracks || []).map((t, idx) => (
                        <span key={idx} className="sc-track-chip">
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Deadlines & Meta */}
                    <div className="sc-conf-meta-grid">
                      <div className="sc-conf-meta-item">
                        <User size={14} />
                        <span>
                          <strong>Chair:</strong> {conf.chairName}
                        </span>
                      </div>
                      <div className="sc-conf-meta-item">
                        <Calendar size={14} />
                        <span>
                          <strong>Dates:</strong> {conf.startDate || 'TBA'} &ndash;{' '}
                          {conf.endDate || 'TBA'}
                        </span>
                      </div>
                      <div className="sc-conf-meta-item">
                        <Clock size={14} />
                        <span>
                          <strong>Submission Due:</strong>{' '}
                          {conf.submissionDeadline || 'Nov 30, 2026'}
                        </span>
                      </div>
                      <div className="sc-conf-meta-item">
                        <Clock size={14} />
                        <span>
                          <strong>Review Due:</strong>{' '}
                          {conf.reviewDeadline || 'Dec 15, 2026'}
                        </span>
                      </div>
                    </div>

                    <div className="sc-conf-card-footer">
                      <span className="sc-conf-enter-link">
                        {navigatingId === cid
                          ? 'Opening Console...'
                          : `Enter ${detectedRole} Console`}
                        <ArrowRight size={15} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronDown, ArrowLeft, LogOut, Shield, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar({
  roleLabel = null,
  backTo = null,
  backLabel = 'Back to Dashboard',
  showDashboardLink = true,
  minimal = false,
}) {
  const { currentUser, userProfile, isSuperAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const displayName =
    userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="sc-navbar">
      <div className="sc-navbar-inner">
        <div className="sc-navbar-left">
          <Link to={currentUser ? '/dashboard' : '/'} className="sc-logo-link">
            <GraduationCap size={26} strokeWidth={2.2} className="sc-logo-icon" />
            <span className="sc-logo-text">ScholarConf</span>
          </Link>

          {backTo ? (
            <Link to={backTo} className="sc-nav-back-link">
              <ArrowLeft size={15} />
              <span>{backLabel}</span>
            </Link>
          ) : (
            showDashboardLink &&
            currentUser && (
              <Link to="/dashboard" className="sc-nav-item-link">
                Dashboard
              </Link>
            )
          )}

          {isSuperAdmin && currentUser && (
            <Link to="/super-admin" className="sc-nav-item-link sc-admin-pill">
              <Shield size={14} /> Super Admin Console
            </Link>
          )}
        </div>

        <div className="sc-navbar-right">
          {minimal ? (
            <a href="#support" onClick={(e) => e.preventDefault()} className="sc-nav-support">
              Support
            </a>
          ) : currentUser ? (
            <>
              <NotificationBell />

              <div className="sc-user-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="sc-user-trigger"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <div className="sc-avatar-circle">{initials || 'SC'}</div>
                  <div className="sc-user-meta">
                    <span className="sc-user-name">{displayName}</span>
                    {roleLabel && <span className="sc-user-role">({roleLabel})</span>}
                  </div>
                  <ChevronDown size={15} className="sc-chevron" />
                </button>

                {menuOpen && (
                  <div className="sc-user-dropdown">
                    <div className="sc-dropdown-info">
                      <strong>{displayName}</strong>
                      <span>{currentUser.email}</span>
                    </div>
                    <Link
                      to="/dashboard"
                      className="sc-dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Compass size={15} /> Browse Conferences
                    </Link>
                    {isSuperAdmin && (
                      <Link
                        to="/super-admin"
                        className="sc-dropdown-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Shield size={15} /> Super Admin Console
                      </Link>
                    )}
                    <button
                      type="button"
                      className="sc-dropdown-item sc-logout-item"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="sc-btn-navy-sm">
              Login / Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ClipboardCheck, FileEdit, FileSearch, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  function handleExplore() {
    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }

  return (
    <div className="sc-landing-page">
      {/* Top Navigation Bar */}
      <header className="sc-navbar">
        <div className="sc-navbar-inner">
          <div className="sc-navbar-left">
            <Link to="/" className="sc-logo-link">
              <GraduationCap size={26} strokeWidth={2.2} className="sc-logo-icon" />
              <span className="sc-logo-text">ScholarConf</span>
            </Link>
            <button
              type="button"
              className="sc-nav-plain-link"
              onClick={handleExplore}
            >
              Conferences
            </button>
            <a
              href="#features"
              className="sc-nav-plain-link"
            >
              Support
            </a>
          </div>

          <div className="sc-navbar-right">
            {currentUser ? (
              <Link to="/dashboard" className="sc-btn-navy">
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/login" className="sc-btn-navy">
                Login / Get Started
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="sc-landing-main" id="features">
        <div className="sc-hero-section">
          <h1 className="sc-hero-title">
            Academic Conference<br />Management Made Simple
          </h1>
          <p className="sc-hero-subtitle">
            End-to-end peer review, paper submission, reviewer matching, and<br />
            program chair workflows for global research conferences.
          </p>
        </div>

        {/* Three Feature Cards */}
        <div className="sc-features-grid">
          {/* Card 1: Program Chair */}
          <div className="sc-feature-card">
            <div className="sc-feature-icon-wrap">
              <ClipboardCheck size={34} strokeWidth={1.7} />
            </div>
            <h3 className="sc-feature-title">Program Chair</h3>
            <div className="sc-feature-divider" />
            <ul className="sc-feature-list">
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>Manage conference tracks &amp; deadlines</span>
              </li>
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>Assign reviewers to submitted papers</span>
              </li>
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>Oversee peer review &amp; final decisions</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Authors */}
          <div className="sc-feature-card">
            <div className="sc-feature-icon-wrap">
              <FileEdit size={34} strokeWidth={1.7} />
            </div>
            <h3 className="sc-feature-title">Authors</h3>
            <div className="sc-feature-divider" />
            <ul className="sc-feature-list">
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>Submit research manuscripts &amp; abstracts</span>
              </li>
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>Track submission &amp; review status in real time</span>
              </li>
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>View peer feedback &amp; acceptance decisions</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Reviewers */}
          <div className="sc-feature-card">
            <div className="sc-feature-icon-wrap">
              <FileSearch size={34} strokeWidth={1.7} />
            </div>
            <h3 className="sc-feature-title">Reviewers</h3>
            <div className="sc-feature-divider" />
            <ul className="sc-feature-list">
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>Access assigned conference papers</span>
              </li>
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>Evaluate research quality &amp; originality</span>
              </li>
              <li>
                <Check size={15} className="sc-check-icon" />
                <span>Submit structured peer reviews on time</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Explore Features CTA */}
        <div className="sc-landing-cta-wrap">
          <button
            type="button"
            className="sc-btn-navy sc-btn-explore"
            onClick={handleExplore}
          >
            Explore Features
          </button>
        </div>
      </main>
    </div>
  );
}

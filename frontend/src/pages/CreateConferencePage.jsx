import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createConferenceRequest } from '../services/api';
import Navbar from '../components/Navbar';

export default function CreateConferencePage() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [chairName, setChairName] = useState(
    userProfile?.name || currentUser?.displayName || ''
  );
  const [tracks, setTracks] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function handleOrganizationChange(val) {
    setOrganizationName(val);
    if (!organizationSlug || organizationSlug === autoSlug(organizationName)) {
      setOrganizationSlug(autoSlug(val));
    }
  }

  function autoSlug(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 28);
  }

  function handleAddTrack() {
    setTracks([...tracks, '']);
  }

  function handleRemoveTrack(index) {
    if (tracks.length <= 1) return;
    setTracks(tracks.filter((_, idx) => idx !== index));
  }

  function handleTrackChange(index, value) {
    const updated = [...tracks];
    updated[index] = value;
    setTracks(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const validTracks = tracks.map((t) => t.trim()).filter(Boolean);
    if (!organizationName.trim() || !organizationSlug.trim() || !chairName.trim()) {
      setError('Organization Name, Organization Slug, and Chair Name are required.');
      return;
    }
    if (validTracks.length === 0) {
      setError('Please enter at least one conference track.');
      return;
    }

    setLoading(true);
    try {
      await createConferenceRequest({
        organizationName: organizationName.trim(),
        organizationSlug: organizationSlug.trim(),
        chairName: chairName.trim(),
        conferenceName: `${organizationSlug.trim().toUpperCase()} 2026: ${organizationName.trim()}`,
        tracks: validTracks,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sc-page-bg">
      <Navbar backTo="/dashboard" backLabel="Back to Home" minimal />

      <div className="sc-centered-card-wrap">
        <div className="sc-form-card">
          <div className="sc-card-cap-icon">
            <GraduationCap size={38} strokeWidth={1.8} />
          </div>

          <h1 className="sc-auth-title">Create a Conference</h1>
          <p className="sc-auth-subtitle">
            Submit a new conference request for organization approval.
          </p>

          {error && <div className="sc-alert-error">{error}</div>}
          {success && (
            <div className="sc-alert-success">
              Conference request submitted! Status: <strong>Pending Approval</strong>. Redirecting to dashboard...
            </div>
          )}

          <form onSubmit={handleSubmit} className="sc-auth-form">
            <div className="sc-form-group">
              <label className="sc-label">Organization Name</label>
              <input
                type="text"
                required
                className="sc-input"
                placeholder="e.g., IEEE Robotics & Automation Society"
                value={organizationName}
                onChange={(e) => handleOrganizationChange(e.target.value)}
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-label">Organization Slug</label>
              <input
                type="text"
                required
                className="sc-input"
                placeholder="e.g., ieee-ras"
                value={organizationSlug}
                onChange={(e) => setOrganizationSlug(e.target.value)}
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-label">Chair Name</label>
              <input
                type="text"
                required
                className="sc-input"
                placeholder="e.g., Dr. Jane Doe"
                value={chairName}
                onChange={(e) => setChairName(e.target.value)}
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-label">Tracks</label>
              {tracks.map((track, idx) => (
                <div key={idx} className="sc-dynamic-track-row">
                  <input
                    type="text"
                    required={idx === 0}
                    className="sc-input"
                    placeholder={
                      idx === 0
                        ? 'e.g., Machine Learning & AI'
                        : 'e.g., Computer Vision'
                    }
                    value={track}
                    onChange={(e) => handleTrackChange(idx, e.target.value)}
                  />
                  {tracks.length > 1 && idx > 0 && (
                    <button
                      type="button"
                      className="sc-row-remove-btn"
                      onClick={() => handleRemoveTrack(idx)}
                      title="Remove Track"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="sc-btn-dashed"
                onClick={handleAddTrack}
              >
                <Plus size={14} /> Add Another Track
              </button>
            </div>

            <button
              type="submit"
              className="sc-btn-navy sc-btn-full"
              disabled={loading || success}
            >
              {loading ? 'Submitting Request...' : 'Submit Conference Request'}
            </button>

            <div className="sc-form-cancel-wrap">
              <button
                type="button"
                className="sc-cancel-link"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

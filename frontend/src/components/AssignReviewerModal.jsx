import React, { useState } from 'react';
import { X, Plus, UserCheck } from 'lucide-react';
import { assignReviewersToPaper } from '../services/api';

export default function AssignReviewerModal({ paper, onClose, onAssigned }) {
  const [reviewers, setReviewers] = useState([
    { name: '', email: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleAddRow() {
    setReviewers([...reviewers, { name: '', email: '' }]);
  }

  function handleRemoveRow(index) {
    if (reviewers.length <= 1) return;
    setReviewers(reviewers.filter((_, idx) => idx !== index));
  }

  function handleChange(index, field, value) {
    const updated = [...reviewers];
    updated[index][field] = value;
    setReviewers(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const valid = reviewers.filter((r) => r.name.trim() && r.email.trim());
    if (valid.length === 0) {
      setError('Please enter at least one reviewer name and email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await assignReviewersToPaper(paper.paperId, valid);
      onAssigned(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <div>
            <h3 className="sc-modal-title">Assign Reviewers</h3>
            <p className="sc-modal-subtitle">
              {paper.paperNumber || paper.paperId} &mdash; {paper.title}
            </p>
          </div>
          <button type="button" className="sc-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sc-modal-body">
          {paper.assignedReviewers && paper.assignedReviewers.length > 0 && (
            <div className="sc-existing-reviewers-box">
              <span className="sc-label-sm">Currently Assigned Reviewers:</span>
              <div className="sc-reviewer-chips">
                {paper.assignedReviewers.map((r, i) => (
                  <span key={i} className="sc-reviewer-chip">
                    {r.name} ({r.email}) &bull; <strong>{r.status}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && <div className="sc-alert-error">{error}</div>}

          <div className="sc-form-group">
            <label className="sc-label">Reviewers to Assign</label>
            <p className="sc-helper-text">
              Existing ScholarConf users will be assigned immediately. Users without an account will receive an automated email invitation.
            </p>

            {reviewers.map((rev, index) => (
              <div key={index} className="sc-dynamic-row">
                <input
                  type="text"
                  required
                  className="sc-input"
                  placeholder="Reviewer Name (e.g., Dr. Alan Turing)"
                  value={rev.name}
                  onChange={(e) => handleChange(index, 'name', e.target.value)}
                />
                <input
                  type="email"
                  required
                  className="sc-input"
                  placeholder="Reviewer Email (e.g., alan@cam.ac.uk)"
                  value={rev.email}
                  onChange={(e) => handleChange(index, 'email', e.target.value)}
                />
                {reviewers.length > 1 && (
                  <button
                    type="button"
                    className="sc-row-remove-btn"
                    onClick={() => handleRemoveRow(index)}
                    title="Remove Reviewer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="sc-btn-dashed"
              onClick={handleAddRow}
            >
              <Plus size={15} /> Add Another Reviewer
            </button>
          </div>

          <div className="sc-modal-footer">
            <button type="button" className="sc-btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sc-btn-navy" disabled={loading}>
              <UserCheck size={16} />
              {loading ? 'Assigning & Sending Emails...' : 'Assign Reviewer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

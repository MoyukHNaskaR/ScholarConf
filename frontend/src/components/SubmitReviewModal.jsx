import React, { useState, useEffect } from 'react';
import { X, FileText, Save, Send } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { submitPeerReview } from '../services/api';

const RECOMMENDATIONS = [
  'Accept',
  'Weak Accept',
  'Borderline',
  'Weak Reject',
  'Reject',
];

export default function SubmitReviewModal({
  paper,
  readOnly = false,
  onClose,
  onSubmitted,
}) {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    originalityRating: 4,
    technicalQualityRating: 4,
    presentationRating: 4,
    overallRecommendation: 'Accept',
    strengths: '',
    weaknesses: '',
    comments: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadExistingReview() {
      if (!currentUser || !paper?.paperId) {
        setFetching(false);
        return;
      }
      try {
        const revId = `${paper.paperId}_${currentUser.uid}`;
        const snap = await getDoc(doc(db, 'reviews', revId));
        if (snap.exists()) {
          const d = snap.data();
          setForm({
            originalityRating: d.originalityRating || 4,
            technicalQualityRating: d.technicalQualityRating || 4,
            presentationRating: d.presentationRating || 4,
            overallRecommendation: d.overallRecommendation || 'Accept',
            strengths: d.strengths || '',
            weaknesses: d.weaknesses || '',
            comments: d.comments || '',
          });
        }
      } catch (e) {
        console.warn('Could not load existing review:', e.message);
      } finally {
        setFetching(false);
      }
    }
    loadExistingReview();
  }, [currentUser, paper]);

  async function handleAction(statusType) {
    setError(null);
    if (
      statusType === 'Completed' &&
      (!form.comments.trim() || !form.strengths.trim() || !form.weaknesses.trim())
    ) {
      setError('Please complete Strengths, Weaknesses, and Review Comments before submitting.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitPeerReview({
        paperId: paper.paperId,
        ...form,
        status: statusType, // 'Draft' | 'Completed'
      });
      onSubmitted(res, statusType);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div className="sc-modal-card sc-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <div>
            <h3 className="sc-modal-title">
              {readOnly ? 'Submitted Peer Review Evaluation' : 'Submit Structured Peer Review'}
            </h3>
            <p className="sc-modal-subtitle">
              <strong>{paper.paperNumber || paper.paperId}</strong> &mdash; {paper.title}
            </p>
          </div>
          <button type="button" className="sc-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="sc-modal-body">
          {/* Paper Abstract & Manuscript PDF Box */}
          <div className="sc-paper-summary-box">
            <div className="sc-paper-summary-top">
              <span>
                <strong>Track:</strong> {paper.track} &nbsp;|&nbsp;{' '}
                <strong>Conference:</strong> {paper.conferenceName}
              </span>
              {paper.manuscriptURL && (
                <a
                  href={paper.manuscriptURL}
                  target="_blank"
                  rel="noreferrer"
                  className="sc-pdf-link-btn"
                >
                  <FileText size={14} /> Open Manuscript PDF
                </a>
              )}
            </div>
            {paper.abstract && (
              <p className="sc-paper-abstract-preview">
                <strong>Abstract:</strong> {paper.abstract}
              </p>
            )}
          </div>

          {error && <div className="sc-alert-error">{error}</div>}

          {fetching ? (
            <div className="sc-loading-inline">Loading evaluation form...</div>
          ) : (
            <>
              {/* 3 Ratings Grid */}
              <div className="sc-ratings-grid">
                <div className="sc-form-group">
                  <label className="sc-label">Originality Rating (1-5)</label>
                  <select
                    className="sc-input"
                    disabled={readOnly}
                    value={form.originalityRating}
                    onChange={(e) =>
                      setForm({ ...form, originalityRating: Number(e.target.value) })
                    }
                  >
                    <option value={5}>5 - Exceptional / Groundbreaking</option>
                    <option value={4}>4 - Good / High Originality</option>
                    <option value={3}>3 - Adequate / Incremental</option>
                    <option value={2}>2 - Weak / Limited Novelty</option>
                    <option value={1}>1 - Poor / Known Work</option>
                  </select>
                </div>

                <div className="sc-form-group">
                  <label className="sc-label">Technical Quality Rating (1-5)</label>
                  <select
                    className="sc-input"
                    disabled={readOnly}
                    value={form.technicalQualityRating}
                    onChange={(e) =>
                      setForm({ ...form, technicalQualityRating: Number(e.target.value) })
                    }
                  >
                    <option value={5}>5 - Rigorous & Sound</option>
                    <option value={4}>4 - Solid Methodology</option>
                    <option value={3}>3 - Minor Technical Gaps</option>
                    <option value={2}>2 - Needs Major Validation</option>
                    <option value={1}>1 - Fundamentally Flawed</option>
                  </select>
                </div>

                <div className="sc-form-group">
                  <label className="sc-label">Presentation Rating (1-5)</label>
                  <select
                    className="sc-input"
                    disabled={readOnly}
                    value={form.presentationRating}
                    onChange={(e) =>
                      setForm({ ...form, presentationRating: Number(e.target.value) })
                    }
                  >
                    <option value={5}>5 - Crystal Clear & Well-Organized</option>
                    <option value={4}>4 - Clear & Readable</option>
                    <option value={3}>3 - Satisfactory</option>
                    <option value={2}>2 - Hard to Follow</option>
                    <option value={1}>1 - Poorly Written</option>
                  </select>
                </div>
              </div>

              <div className="sc-form-group">
                <label className="sc-label">Overall Recommendation</label>
                <select
                  className="sc-input"
                  disabled={readOnly}
                  value={form.overallRecommendation}
                  onChange={(e) =>
                    setForm({ ...form, overallRecommendation: e.target.value })
                  }
                >
                  {RECOMMENDATIONS.map((rec) => (
                    <option key={rec} value={rec}>
                      {rec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sc-grid-2">
                <div className="sc-form-group">
                  <label className="sc-label">Strengths *</label>
                  <textarea
                    rows={3}
                    disabled={readOnly}
                    className="sc-textarea"
                    placeholder="Key contributions, strong empirical results, theoretical depth..."
                    value={form.strengths}
                    onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                  />
                </div>

                <div className="sc-form-group">
                  <label className="sc-label">Weaknesses *</label>
                  <textarea
                    rows={3}
                    disabled={readOnly}
                    className="sc-textarea"
                    placeholder="Limitations, missing baselines, clarity issues..."
                    value={form.weaknesses}
                    onChange={(e) => setForm({ ...form, weaknesses: e.target.value })}
                  />
                </div>
              </div>

              <div className="sc-form-group">
                <label className="sc-label">Detailed Review Comments *</label>
                <textarea
                  rows={4}
                  disabled={readOnly}
                  className="sc-textarea"
                  placeholder="Provide detailed, constructive peer review feedback for the authors and program chair..."
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="sc-modal-footer">
            <button type="button" className="sc-btn-outline" onClick={onClose}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <>
                <button
                  type="button"
                  className="sc-btn-outline"
                  disabled={loading}
                  onClick={() => handleAction('Draft')}
                >
                  <Save size={15} /> Save Draft
                </button>
                <button
                  type="button"
                  className="sc-btn-navy"
                  disabled={loading}
                  onClick={() => handleAction('Completed')}
                >
                  <Send size={15} />
                  {loading ? 'Submitting...' : 'Submit Review'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

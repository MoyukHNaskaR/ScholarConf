import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, XCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { makePaperFinalDecision } from '../services/api';

export default function ViewReviewsModal({
  paper,
  isChair = false,
  onClose,
  onDecisionMade,
}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReviews() {
      if (!paper?.paperId) return;
      try {
        const q = query(
          collection(db, 'reviews'),
          where('paperId', '==', paper.paperId)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReviews(list);
      } catch (e) {
        console.warn('Error loading reviews:', e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, [paper]);

  async function handleDecision(decision) {
    setError(null);
    setDeciding(true);
    try {
      const res = await makePaperFinalDecision(paper.paperId, decision);
      if (onDecisionMade) {
        onDecisionMade(res);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div className="sc-modal-card sc-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <div>
            <h3 className="sc-modal-title">
              {isChair ? 'Submission Reviews & Final Decision' : 'Submission Details & Peer Feedback'}
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
          {/* Paper Meta Box */}
          <div className="sc-paper-summary-box">
            <div className="sc-paper-summary-top">
              <div>
                <strong>Conference:</strong> {paper.conferenceName} &nbsp;|&nbsp;{' '}
                <strong>Track:</strong> {paper.track}
              </div>
              {paper.manuscriptURL && (
                <a
                  href={paper.manuscriptURL}
                  target="_blank"
                  rel="noreferrer"
                  className="sc-pdf-link-btn"
                >
                  <FileText size={14} /> View Manuscript PDF
                </a>
              )}
            </div>
            <p className="sc-paper-abstract-preview">
              <strong>Authors:</strong>{' '}
              {(paper.authors || []).map((a) => `${a.name} (${a.email})`).join(', ')}
            </p>
            <p className="sc-paper-abstract-preview">
              <strong>Abstract:</strong> {paper.abstract}
            </p>
            <div style={{ marginTop: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span>
                <strong>Review Status:</strong>{' '}
                <span className="sc-badge sc-badge-blue">{paper.reviewStatus}</span>
              </span>
              {paper.finalDecision && (
                <span>
                  <strong>Final Decision:</strong>{' '}
                  <span
                    className={`sc-badge ${
                      paper.finalDecision === 'Accepted'
                        ? 'sc-badge-green'
                        : 'sc-badge-red'
                    }`}
                  >
                    {paper.finalDecision}
                  </span>
                </span>
              )}
            </div>
          </div>

          {error && <div className="sc-alert-error">{error}</div>}

          {/* Reviewer Evaluations List */}
          <h4 style={{ margin: '18px 0 10px', fontSize: '15px', color: '#0f172a' }}>
            Peer Review Evaluations ({reviews.length})
          </h4>

          {loading ? (
            <div className="sc-loading-inline">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="sc-empty-reviews-box">
              No detailed review forms have been submitted yet.
              {isChair &&
                paper.assignedReviewers &&
                paper.assignedReviewers.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Assigned Reviewer Statuses:</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                      {paper.assignedReviewers.map((r, i) => (
                        <li key={i}>
                          {r.name} ({r.email}) &mdash; <strong>{r.status}</strong>
                          {r.recommendation ? ` (${r.recommendation}, Score: ${r.score}/5.0)` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          ) : (
            <div className="sc-reviews-stack">
              {reviews.map((rev, idx) => (
                <div key={rev.id} className="sc-review-detail-card">
                  <div className="sc-review-detail-header">
                    <strong>
                      {isChair
                        ? `Reviewer #${idx + 1}: ${rev.reviewerName} (${rev.reviewerEmail})`
                        : `Anonymous Reviewer #${idx + 1}`}
                    </strong>
                    <span className="sc-badge sc-badge-navy">
                      Recommendation: {rev.overallRecommendation}
                    </span>
                  </div>
                  <div className="sc-review-scores-bar">
                    <span>Originality: <strong>{rev.originalityRating}/5</strong></span>
                    <span>Technical Quality: <strong>{rev.technicalQualityRating}/5</strong></span>
                    <span>Presentation: <strong>{rev.presentationRating}/5</strong></span>
                  </div>
                  {rev.strengths && (
                    <p className="sc-review-field">
                      <strong>Strengths:</strong> {rev.strengths}
                    </p>
                  )}
                  {rev.weaknesses && (
                    <p className="sc-review-field">
                      <strong>Weaknesses:</strong> {rev.weaknesses}
                    </p>
                  )}
                  {rev.comments && (
                    <p className="sc-review-field">
                      <strong>Detailed Comments:</strong> {rev.comments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="sc-modal-footer">
            <button type="button" className="sc-btn-outline" onClick={onClose}>
              Close
            </button>

            {isChair && (
              <>
                <button
                  type="button"
                  className="sc-btn-reject"
                  disabled={deciding}
                  onClick={() => handleDecision('Rejected')}
                >
                  <XCircle size={15} />
                  {deciding ? 'Saving...' : 'Reject Paper'}
                </button>
                <button
                  type="button"
                  className="sc-btn-accept"
                  disabled={deciding}
                  onClick={() => handleDecision('Accepted')}
                >
                  <CheckCircle size={15} />
                  {deciding ? 'Saving...' : 'Accept Paper'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

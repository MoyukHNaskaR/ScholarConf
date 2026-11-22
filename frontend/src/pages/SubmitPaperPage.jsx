import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, X, Upload, FileText } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { uploadManuscriptPDF } from '../firebase/storageService';
import { submitNewPaper } from '../services/api';
import Navbar from '../components/Navbar';

export default function SubmitPaperPage() {
  const { conferenceId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [conference, setConference] = useState(null);
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState('');
  const [abstract, setAbstract] = useState('');
  const [authors, setAuthors] = useState([
    {
      name: userProfile?.name || currentUser?.displayName || '',
      email: currentUser?.email || '',
    },
    { name: '', email: '' },
  ]);
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    async function loadConference() {
      if (!conferenceId) return;
      const snap = await getDoc(doc(db, 'conferences', conferenceId));
      if (snap.exists()) {
        const cData = snap.data();
        setConference(cData);
        if (cData.tracks && cData.tracks.length > 0) {
          setTrack(cData.tracks[0]);
        }
      }
    }
    loadConference();
  }, [conferenceId]);

  function handleAddAuthor() {
    setAuthors([...authors, { name: '', email: '' }]);
  }

  function handleRemoveAuthor(index) {
    if (authors.length <= 1) return;
    setAuthors(authors.filter((_, idx) => idx !== index));
  }

  function handleAuthorChange(index, field, value) {
    const updated = [...authors];
    updated[index][field] = value;
    setAuthors(updated);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Please select a valid PDF document (.pdf).');
      return;
    }
    setError(null);
    setPdfFile(file);
  }

  const wordCount = abstract.trim()
    ? abstract.trim().split(/\s+/).filter(Boolean).length
    : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !track.trim() || !abstract.trim()) {
      setError('Please fill in Paper Title, Conference Track, and Abstract.');
      return;
    }

    if (wordCount > 300) {
      setError(`Abstract must not exceed 300 words (currently ${wordCount} words).`);
      return;
    }

    const validAuthors = authors.filter((a) => a.name.trim() && a.email.trim());
    if (validAuthors.length === 0) {
      setError('Please enter at least one author with name and email.');
      return;
    }

    if (!pdfFile) {
      setError('Please upload your manuscript PDF before submitting.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload Manuscript PDF to Firebase Storage
      const uploadRes = await uploadManuscriptPDF(
        pdfFile,
        conferenceId,
        currentUser?.uid
      );

      // 2. Save Paper Submission via Backend (triggers notifications & emails)
      const res = await submitNewPaper({
        conferenceId,
        title: title.trim(),
        track: track.trim(),
        abstract: abstract.trim(),
        authors: validAuthors,
        manuscriptURL: uploadRes.manuscriptURL,
        manuscriptFileName: uploadRes.manuscriptFileName,
      });

      setSuccessMsg(
        res.message || 'Manuscript submitted! Redirecting to Author Console...'
      );
      setTimeout(() => {
        navigate(`/conference/${conferenceId}/author`);
      }, 1400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const trackOptions =
    conference?.tracks && conference.tracks.length > 0
      ? conference.tracks
      : [
          'Machine Learning & AI',
          'Graph Representation Learning',
          'Computer Vision',
          'Natural Language Processing',
        ];

  return (
    <div className="sc-page-bg">
      <Navbar
        roleLabel="Author"
        backTo={`/conference/${conferenceId}/author`}
        backLabel="Back to Dashboard"
      />

      <div className="sc-centered-card-wrap">
        <div className="sc-form-card sc-form-card-wide">
          <div className="sc-card-cap-icon">
            <GraduationCap size={38} strokeWidth={1.8} />
          </div>

          <h1 className="sc-auth-title">Submit New Paper</h1>
          <p className="sc-auth-subtitle">
            Enter paper details, add authors, and upload your manuscript PDF.
          </p>

          {error && <div className="sc-alert-error">{error}</div>}
          {successMsg && <div className="sc-alert-success">{successMsg}</div>}

          <form onSubmit={handleSubmit} className="sc-auth-form">
            <div className="sc-form-group">
              <label className="sc-label">Paper Title</label>
              <input
                type="text"
                required
                className="sc-input"
                placeholder="e.g., Active Learning on Graph Neural Networks"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-label">Track</label>
              <select
                className="sc-input"
                required
                value={track}
                onChange={(e) => setTrack(e.target.value)}
              >
                <option value="" disabled>
                  Select a conference track
                </option>
                {trackOptions.map((t, idx) => (
                  <option key={idx} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="sc-form-group">
              <div className="sc-label-row">
                <label className="sc-label" style={{ marginBottom: 0 }}>
                  Abstract
                </label>
                <span
                  className="sc-word-count"
                  style={{ color: wordCount > 300 ? '#dc2626' : '#64748b' }}
                >
                  {wordCount} / 300 words
                </span>
              </div>
              <textarea
                rows={4}
                required
                className="sc-textarea"
                placeholder="Enter a brief summary of your paper (max 300 words)..."
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-label">Authors</label>
              {authors.map((author, idx) => (
                <div key={idx} className="sc-dynamic-row">
                  <input
                    type="text"
                    required={idx === 0}
                    className="sc-input"
                    placeholder={idx === 0 ? 'e.g., Jane Doe' : 'e.g., John Smith'}
                    value={author.name}
                    onChange={(e) =>
                      handleAuthorChange(idx, 'name', e.target.value)
                    }
                  />
                  <input
                    type="email"
                    required={idx === 0}
                    className="sc-input"
                    placeholder={
                      idx === 0
                        ? 'e.g., jane.doe@university.edu'
                        : 'e.g., john.smith@university.edu'
                    }
                    value={author.email}
                    onChange={(e) =>
                      handleAuthorChange(idx, 'email', e.target.value)
                    }
                  />
                  {authors.length > 1 && idx > 0 && (
                    <button
                      type="button"
                      className="sc-row-remove-btn"
                      onClick={() => handleRemoveAuthor(idx)}
                      title="Remove Author"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="sc-btn-dashed"
                onClick={handleAddAuthor}
              >
                <Plus size={14} /> Add Another Author
              </button>
            </div>

            <div className="sc-form-group">
              <label className="sc-label">Upload Manuscript (PDF)</label>
              <div
                className={`sc-upload-dropzone ${pdfFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                {pdfFile ? (
                  <div className="sc-upload-selected">
                    <FileText size={28} className="sc-upload-icon-active" />
                    <div className="sc-upload-filename">{pdfFile.name}</div>
                    <div className="sc-upload-filesize">
                      {(pdfFile.size / 1024).toFixed(1)} KB &bull; Click to replace PDF
                    </div>
                  </div>
                ) : (
                  <div className="sc-upload-prompt">
                    <Upload size={26} className="sc-upload-icon" />
                    <div className="sc-upload-text">
                      <strong>Click to upload manuscript PDF</strong> or drag and drop
                    </div>
                    <div className="sc-upload-subtext">
                      PDF format only (max 15 MB)
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="sc-btn-navy sc-btn-full"
              disabled={loading || Boolean(successMsg)}
            >
              {loading ? 'Uploading PDF & Submitting...' : 'Submit Paper'}
            </button>

            <div className="sc-form-cancel-wrap">
              <button
                type="button"
                className="sc-cancel-link"
                onClick={() => navigate(`/conference/${conferenceId}/author`)}
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

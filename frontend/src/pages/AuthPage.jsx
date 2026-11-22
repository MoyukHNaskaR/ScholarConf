import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function AuthPage() {
  const {
    currentUser,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    resetPassword,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  function switchMode(newMode) {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
        navigate('/dashboard');
      } else if (mode === 'signup') {
        await registerWithEmail({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        navigate('/dashboard');
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setSuccessMsg('Password reset instructions have been sent to your email.');
      }
    } catch (err) {
      const msg = err.message || 'Authentication failed';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Please log in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Google Sign-In could not be completed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sc-page-bg">
      <Navbar backTo="/" backLabel="Back to Home" minimal />

      <div className="sc-centered-card-wrap">
        <div className="sc-auth-card">
          <div className="sc-card-cap-icon">
            <GraduationCap size={38} strokeWidth={1.8} />
          </div>

          {mode === 'login' && (
            <>
              <h1 className="sc-auth-title">Log In to ScholarConf</h1>
              <p className="sc-auth-subtitle">
                Access your author, reviewer, or program chair console.
              </p>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h1 className="sc-auth-title">Create an Account</h1>
              <p className="sc-auth-subtitle">
                Join ScholarConf to submit papers, review manuscripts, or host conferences.
              </p>
            </>
          )}

          {mode === 'reset' && (
            <>
              <h1 className="sc-auth-title">Reset Your Password</h1>
              <p className="sc-auth-subtitle">
                Enter your registered email address to receive a password reset link.
              </p>
            </>
          )}

          {error && <div className="sc-alert-error">{error}</div>}
          {successMsg && <div className="sc-alert-success">{successMsg}</div>}

          <form onSubmit={handleEmailSubmit} className="sc-auth-form">
            {mode === 'signup' && (
              <div className="sc-form-group">
                <label className="sc-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="sc-input"
                  placeholder="e.g., Dr. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="sc-form-group">
              <label className="sc-label">Email Address</label>
              <input
                type="email"
                required
                className="sc-input"
                placeholder="name@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode !== 'reset' && (
              <div className="sc-form-group">
                <div className="sc-label-row">
                  <label className="sc-label" style={{ marginBottom: 0 }}>
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="sc-forgot-link"
                      onClick={() => switchMode('reset')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  className="sc-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="sc-form-group">
                <label className="sc-label">Confirm Password</label>
                <input
                  type="password"
                  required
                  className="sc-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="sc-btn-navy sc-btn-full"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Log In'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="sc-divider-text">
                <span>Or sign in with</span>
              </div>

              <button
                type="button"
                className="sc-btn-google"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </>
          )}

          <div className="sc-auth-footer">
            {mode === 'login' && (
              <>
                New to ScholarConf?{' '}
                <button
                  type="button"
                  className="sc-link-btn"
                  onClick={() => switchMode('signup')}
                >
                  Create an account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="sc-link-btn"
                  onClick={() => switchMode('login')}
                >
                  Log in
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                className="sc-link-btn"
                onClick={() => switchMode('login')}
              >
                ← Back to Log In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

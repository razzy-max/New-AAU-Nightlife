import { useState } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to send reset email');
      }

      setStatus('success');
      setMessage(data.message || 'If your account exists, a reset link has been sent.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        <p>Enter your email and we will send a reset link.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="login-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        {message && <div className={status === 'error' ? 'error-message' : 'success-message'}>{message}</div>}
        <div className="auth-links">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

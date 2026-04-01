import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_BASE_URL from '../config';
import { setUserAuth } from '../utils/userAuth';

function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Verification failed');
        }

        setUserAuth(data);
        setStatus('success');
        setMessage(data.message || 'Email verified successfully. Redirecting...');

        setTimeout(() => {
          navigate('/profile');
        }, 1800);
      } catch (error) {
        setStatus('error');
        setMessage(error.message);
      }
    };

    verifyEmail();
  }, [navigate, token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{status === 'success' ? 'Email Verified' : status === 'error' ? 'Verification Failed' : 'Verifying Email'}</h1>
        <p>{message}</p>
        {status === 'error' && (
          <div className="auth-links">
            <a href="/login">Back to Sign In</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;

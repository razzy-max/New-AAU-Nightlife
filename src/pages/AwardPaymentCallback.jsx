import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserToken } from '../utils/userAuth';
import './AwardPaymentCallback.css';

const CONFETTI_COUNT = 14;
const confettiPieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  id: i,
  rot: `${Math.round((i / CONFETTI_COUNT) * 360)}deg`,
  dist: `${90 + Math.round(Math.random() * 60)}px`,
  delay: `${(i % 5) * 0.03}s`,
  color: i % 3 === 0 ? '#000000' : '#DAA520',
}));

function AwardPaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Confirming your payment with Paystack...');
  const [voteSummary, setVoteSummary] = useState(null);
  const [redirectIn, setRedirectIn] = useState(4);
  const verificationAttemptedRef = useRef(false);

  useEffect(() => {
    const verifyPayment = async () => {
      if (verificationAttemptedRef.current) {
        return;
      }
      verificationAttemptedRef.current = true;

      let redirectTarget = '/awards';

      try {
        const reference = searchParams.get('reference');
        if (!reference) {
          throw new Error('No payment reference found in the URL');
        }

        const pendingVoteStr = sessionStorage.getItem('pendingVote');
        if (!pendingVoteStr) {
          throw new Error('No pending vote found. Your payment session may have expired.');
        }

        const pendingVote = JSON.parse(pendingVoteStr);
        const { candidateId, categoryId, voteCount } = pendingVote;
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

        const userToken = getUserToken();
        const response = await fetch(`${API_BASE_URL}/api/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
          body: JSON.stringify({ reference, candidateId, categoryId, voteCount }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Payment verification failed');
        }

        const returnCategoryId = sessionStorage.getItem('returnToCategoryId');
        const returnEventSlug = sessionStorage.getItem('returnToEventSlug');

        sessionStorage.removeItem('pendingVote');
        sessionStorage.removeItem('returnToCategoryId');
        sessionStorage.removeItem('returnToEventSlug');

        const base = returnEventSlug ? `/awards/${returnEventSlug}` : '/awards';
        redirectTarget = returnCategoryId
          ? `${base}?category=${returnCategoryId}#vote-distribution`
          : `${base}#vote-distribution`;

        setVoteSummary({
          candidate: data.data.candidate,
          votesRecorded: data.data.votesRecorded || voteCount,
        });
        setStatus('success');
        setMessage('Your payment was verified and your votes have been recorded.');
      } catch (error) {
        console.error('[CALLBACK] Error:', error);
        setStatus('error');
        setMessage(error.message || 'Payment verification failed');
        return;
      }

      const timer = setInterval(() => {
        setRedirectIn((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate(redirectTarget);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate]);

  return (
    <div className="payment-callback-page">
      <div className={`payment-callback-card status-${status}`}>
        {status === 'verifying' && (
          <>
            <div className="callback-spinner" />
            <h2>Verifying Payment</h2>
            <p className="callback-message">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            {confettiPieces.map((p) => (
              <span
                key={p.id}
                className="confetti-piece"
                style={{ '--rot': p.rot, '--dist': p.dist, animationDelay: p.delay, background: p.color }}
              />
            ))}
            <div className="callback-icon-circle success">
              <svg className="callback-checkmark" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="38" />
                <path d="M24 44l12 12 24-26" />
              </svg>
            </div>
            <h2>Vote Cast Successfully!</h2>
            <p className="callback-message">{message}</p>

            {voteSummary && (
              <div className="callback-vote-summary">
                <div className="candidate">{voteSummary.candidate}</div>
                <div className="count">{voteSummary.votesRecorded} vote(s) recorded</div>
              </div>
            )}

            <p className="callback-redirect-note">Taking you back to the event in {redirectIn}s...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="callback-icon-circle error">
              <svg className="callback-error-icon" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="38" />
                <path d="M28 28l28 28M56 28l-28 28" />
              </svg>
            </div>
            <h2>Verification Failed</h2>
            <p className="callback-message">{message}</p>
            <button className="callback-return-btn" onClick={() => navigate('/awards')}>
              Return to Awards
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AwardPaymentCallback;

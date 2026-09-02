import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserToken } from '../utils/userAuth';

function AwardPaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const verificationAttemptedRef = useRef(false);

  useEffect(() => {
    const verifyPayment = async () => {
      if (verificationAttemptedRef.current) {
        return;
      }
      verificationAttemptedRef.current = true;

      try {
        // Step 1: Extract reference from URL
        const reference = searchParams.get('reference');
        console.log('[CALLBACK] Reference from URL:', reference);

        if (!reference) {
          throw new Error('No payment reference found in URL');
        }

        // Step 2: Get pending vote from session
        const pendingVoteStr = sessionStorage.getItem('pendingVote');
        if (!pendingVoteStr) {
          throw new Error('No pending vote found. Payment session may have expired.');
        }

        const pendingVote = JSON.parse(pendingVoteStr);
        const { candidateId, categoryId, voteCount } = pendingVote;
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

        console.log('[CALLBACK] Verifying payment with:', {
          reference,
          candidateId,
          categoryId,
          voteCount,
        });

        // Step 3: Call backend to verify payment and record vote
        const userToken = getUserToken();
        const response = await fetch(`${API_BASE_URL}/api/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
          body: JSON.stringify({
            reference,
            candidateId,
            categoryId,
            voteCount,
          }),
        });

        const data = await response.json();
        console.log('[CALLBACK] Verification response:', data);

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Payment verification failed');
        }

        // Get category/event to return to
        const returnCategoryId = sessionStorage.getItem('returnToCategoryId');
        const returnEventSlug = sessionStorage.getItem('returnToEventSlug');

        // Clear session storage
        sessionStorage.removeItem('pendingVote');
        sessionStorage.removeItem('returnToCategoryId');
        sessionStorage.removeItem('returnToEventSlug');

        // Success!
        setStatus('success');
        setMessage(`✓ Payment verified! ${data.data.votesRecorded || voteCount} vote(s) recorded for ${data.data.candidate}`);

        // Redirect after 3 seconds to the same event/category
        setTimeout(() => {
          const base = returnEventSlug ? `/awards/${returnEventSlug}` : '/awards';
          if (returnCategoryId) {
            navigate(`${base}?category=${returnCategoryId}#vote-distribution`);
          } else {
            navigate(`${base}#vote-distribution`);
          }
        }, 3000);
      } catch (error) {
        console.error('[CALLBACK] Error:', error);
        setStatus('error');
        setMessage(error.message || 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div style={{ marginTop: '100px', minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
        {status === 'verifying' && (
          <div>
            <div className="loading-spinner" style={{ marginBottom: '20px' }}></div>
            <h2 style={{ color: '#DAA520', fontFamily: 'Georgia, serif' }}>
              Verifying Payment
            </h2>
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <h2 style={{ color: '#28a745', fontFamily: 'Georgia, serif', marginBottom: '10px' }}>
              ✓ Success!
            </h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {message}
            </p>
            <p style={{ color: '#999', fontSize: '14px' }}>
              Redirecting to awards page...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <h2 style={{ color: '#dc3545', fontFamily: 'Georgia, serif', marginBottom: '10px' }}>
              ✗ Verification Failed
            </h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {message}
            </p>
            <button
              onClick={() => navigate('/awards')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Return to Awards
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AwardPaymentCallback;

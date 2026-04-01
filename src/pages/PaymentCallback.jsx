import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [orderId, setOrderId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const verificationAttemptedRef = useRef(false);

  useEffect(() => {
    const verifyPayment = async () => {
      // Prevent duplicate verification in strict mode
      if (verificationAttemptedRef.current) {
        return;
      }
      verificationAttemptedRef.current = true;

      try {
        const reference = searchParams.get('reference');

        if (!reference) {
          throw new Error('No payment reference found');
        }

        // Try to get pending purchase from sessionStorage first, then localStorage as backup
        let pendingPurchase = null;
        const sessionData = sessionStorage.getItem('pendingPurchase');
        const localData = localStorage.getItem('pendingPurchase');

        if (sessionData) {
          pendingPurchase = JSON.parse(sessionData);
        } else if (localData) {
          pendingPurchase = JSON.parse(localData);
          console.log('Using localStorage backup for purchase data');
        }

        // Prepare verification request - backend can extract data from Paystack if needed
        const verificationBody = {
          reference,
          // Include data if available, backend will use Paystack metadata as fallback
          ticketTypeName: pendingPurchase?.ticketTypeName || null,
          ticketTypePrice: pendingPurchase?.ticketTypePrice || null,
          email: pendingPurchase?.email || null,
          name: pendingPurchase?.name || null,
          whatsapp: pendingPurchase?.whatsapp || null,
          quantity: pendingPurchase?.quantity || 1,
        };

        // Get eventId from storage or try to extract from reference
        const eventId = pendingPurchase?.eventId;
        
        if (!eventId) {
          // If no eventId, we'll still try - backend might be able to get it from Paystack metadata
          console.warn('No eventId found in storage, attempting verification anyway');
        }

        // Use a generic endpoint if no eventId, otherwise use the specific one
        const verifyUrl = eventId 
          ? `${API_BASE_URL}/api/tickets/purchase/verify/${eventId}`
          : `${API_BASE_URL}/api/tickets/purchase/verify/unknown`;

        // Verify payment with backend (backend extracts data from Paystack if not provided)
        const response = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verificationBody),
        });

        const data = await response.json();

        if (!response.ok) {
          // If server error, allow retry
          if (response.status >= 500 && retryCount < 3) {
            setRetryCount(prev => prev + 1);
            setMessage(`Verification failed, retrying... (Attempt ${retryCount + 2}/3)`);
            verificationAttemptedRef.current = false;
            setTimeout(() => verifyPayment(), 2000);
            return;
          }
          throw new Error(data.message || 'Payment verification failed');
        }

        if (!data.success) {
          throw new Error(data.message || 'Failed to create ticket');
        }

        // Clear storage on success
        sessionStorage.removeItem('pendingPurchase');
        localStorage.removeItem('pendingPurchase');

        // Set success state and redirect to ticket
        setStatus('success');
        setMessage('Payment successful! Redirecting to your order...');
        setOrderId(data.orderId);

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate(`/order-confirmation/${data.orderId}`);
        }, 2000);
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage(error.message);
      }
    };

    verifyPayment();
  }, [searchParams, navigate, retryCount]);

  const handleRetry = () => {
    setStatus('verifying');
    setMessage('Retrying verification...');
    verificationAttemptedRef.current = false;
    setRetryCount(0);
  };

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
              ✓ Payment Successful!
            </h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {message}
            </p>
            {orderId && (
              <p style={{ fontSize: '12px', color: '#999' }}>
                Order ID: {orderId}
              </p>
            )}
          </div>
        )}

        {status === 'error' && (
          <div>
            <h2 style={{ color: '#dc3545', fontFamily: 'Georgia, serif', marginBottom: '10px' }}>
              ✗ Payment Verification Failed
            </h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {message}
            </p>
            <p style={{ marginBottom: '20px', fontSize: '14px', color: '#888' }}>
              If your payment was successful, your ticket will be sent to your email automatically. 
              Please check your inbox (and spam folder).
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleRetry}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Retry Verification
              </button>
              <button
                onClick={() => navigate('/events')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#DAA520',
                  color: 'black',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Back to Events
              </button>
            </div>
            <p style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
              Reference: {searchParams.get('reference')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentCallback;

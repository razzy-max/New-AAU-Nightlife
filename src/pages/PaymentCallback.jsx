import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [ticketId, setTicketId] = useState(null);
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

        // Get pending purchase from session storage
        const pendingPurchaseStr = sessionStorage.getItem('pendingPurchase');
        if (!pendingPurchaseStr) {
          throw new Error('Payment session expired. Please try again.');
        }

        const pendingPurchase = JSON.parse(pendingPurchaseStr);
        const { ticketTypeName, ticketTypePrice, email, name, whatsapp, eventId } = pendingPurchase;

        // Verify payment with backend
        const response = await fetch(`${API_BASE_URL}/api/tickets/purchase/verify/${eventId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference,
            ticketTypeName,
            ticketTypePrice,
            email,
            name,
            whatsapp,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Payment verification failed');
        }

        if (!data.success) {
          throw new Error('Failed to create ticket');
        }

        // Clear session storage
        sessionStorage.removeItem('pendingPurchase');

        // Set success state and redirect to ticket
        setStatus('success');
        setMessage('Payment successful! Redirecting to your ticket...');
        setTicketId(data.ticketId);

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate(`/ticket/${data.ticketId}`);
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage(error.message);
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
              ✓ Payment Successful!
            </h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {message}
            </p>
            {ticketId && (
              <p style={{ fontSize: '12px', color: '#999' }}>
                Ticket ID: {ticketId}
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
        )}
      </div>
    </div>
  );
}

export default PaymentCallback;

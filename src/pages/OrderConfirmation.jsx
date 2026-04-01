import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import API_BASE_URL from '../config';

function OrderConfirmation() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNudge, setShowNudge] = useState(false);
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to load order');
        }

        setOrder(data.order);
        const token = localStorage.getItem('userToken');
        if (!token) {
          setShowNudge(true);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!order || autoTriggeredRef.current) {
      return;
    }

    const autoDownloadKey = `order-auto-download:${orderId}`;
    if (localStorage.getItem(autoDownloadKey)) {
      autoTriggeredRef.current = true;
      return;
    }

    autoTriggeredRef.current = true;
    localStorage.setItem(autoDownloadKey, '1');

    if (order.tickets?.length === 1) {
      const ticketId = order.tickets[0].ticketId;
      window.location.href = `${API_BASE_URL}/api/tickets/${ticketId}/download`;
    } else if ((order.tickets?.length || 0) > 1) {
      window.location.href = `${API_BASE_URL}/api/orders/${orderId}/download`;
    }
  }, [order, orderId]);

  if (loading) {
    return <div className="auth-page"><div className="auth-card"><p>Loading order...</p></div></div>;
  }

  if (error) {
    return <div className="auth-page"><div className="auth-card"><div className="error-message">{error}</div></div></div>;
  }

  const hasMultiple = (order?.tickets?.length || 0) > 1;

  return (
    <div className="order-confirmation-page">
      <div className="order-confirmation-card">
        <h1>Payment Successful</h1>
        <p>Your tickets are ready. A copy has been sent to {order.buyerEmail}.</p>

        <div className="order-summary">
          <p><strong>Ticket Type:</strong> {order.ticketTypeName}</p>
          <p><strong>Quantity:</strong> {order.quantity}</p>
          <p><strong>Total:</strong> N{Number(order.totalAmount || 0).toLocaleString()}</p>
        </div>

        <div className="download-actions">
          {hasMultiple ? (
            <a className="rsvp-btn" href={`${API_BASE_URL}/api/orders/${orderId}/download`}>Download All Tickets (ZIP)</a>
          ) : (
            <a className="rsvp-btn" href={`${API_BASE_URL}/api/tickets/${order.tickets[0]?.ticketId}/download`}>Download Ticket</a>
          )}
        </div>

        <div className="tickets-list">
          {order.tickets?.map((ticket) => (
            <div key={ticket.ticketId} className="ticket-line">
              <div>
                <strong>{ticket.ticketId}</strong>
              </div>
              <div className="ticket-line-actions">
                <a href={`/ticket/${ticket.ticketId}`}>View</a>
                <a href={`${API_BASE_URL}/api/tickets/${ticket.ticketId}/download`}>Download</a>
              </div>
            </div>
          ))}
        </div>

        {showNudge && (
          <div className="signup-nudge">
            <h3>Save this order to your account</h3>
            <p>
              Create an account with {order.buyerEmail} to prevent ticket loss, keep all your
              tickets in one place, and view or download your ticket history anytime.
            </p>
            <p>
              Your current tickets are already sent to your email, but an account makes recovery
              easier if you change device or lose messages.
            </p>
            <div className="nudge-actions">
              <Link className="submit-btn" to={`/register?redirect=/order-confirmation/${orderId}`}>Create Account</Link>
              <Link className="cancel-btn" to="/events">Later</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderConfirmation;

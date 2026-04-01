import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import { formatTime } from '../utils/formatTime';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/events/${id}`);
        if (!response.ok) throw new Error('Failed to load event');
        const data = await response.json();
        setEvent(data);
        // Set first ticket as default if ticketing is enabled
        if (data.hasTicketing && data.tickets && data.tickets.length > 0) {
          setSelectedTicketId(data.tickets[0]._id || data.tickets[0].id || '');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handlePurchase = async (e) => {
    e.preventDefault();

    console.log('Form submission:', {
      selectedTicketId,
      selectedTicketIdType: typeof selectedTicketId,
      email,
      name,
      whatsapp,
      event: event?.hasTicketing,
      tickets: event?.tickets?.map(t => ({ id: t._id, name: t.name })),
    });

    // Check if all fields are filled - convert selectedTicketId to string
    const ticketIdStr = selectedTicketId ? String(selectedTicketId).trim() : '';
    const emailStr = email ? String(email).trim() : '';
    const nameStr = name ? String(name).trim() : '';
    const whatsappStr = whatsapp ? String(whatsapp).trim() : '';

    if (!ticketIdStr) {
      console.error('Ticket ID is empty:', selectedTicketId);
      alert('Please select a ticket');
      return;
    }
    if (!emailStr) {
      console.error('Email is empty:', email);
      alert('Please enter your email');
      return;
    }
    if (!nameStr) {
      console.error('Name is empty:', name);
      alert('Please enter your name');
      return;
    }
    if (!whatsappStr) {
      console.error('WhatsApp is empty:', whatsapp);
      alert('Please enter your WhatsApp number');
      return;
    }

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Extract the ticket index from ticketId (could be ObjectId or "ticket-N")
    let ticketIndex = -1;
    if (ticketIdStr.startsWith('ticket-')) {
      ticketIndex = parseInt(ticketIdStr.replace('ticket-', ''), 10);
    } else {
      // If it's an ObjectId, find it in the tickets array
      ticketIndex = event.tickets.findIndex(t => String(t._id) === ticketIdStr);
    }

    if (ticketIndex === -1) {
      alert('Invalid ticket selection');
      return;
    }

    const selectedTicket = event.tickets[ticketIndex];

    setSubmitting(true);
    try {
      setError(null);

      // Step 1: Initiate Paystack payment
      // Send ticket name and price instead of ticketTypeId
      const purchaseResponse = await fetch(`${API_BASE_URL}/api/tickets/purchase/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketTypeName: selectedTicket.name,
          ticketTypePrice: selectedTicket.price,
          email: emailStr,
          name: nameStr,
          whatsapp: whatsappStr
        }),
      });

      if (!purchaseResponse.ok) {
        throw new Error('Failed to initiate payment');
      }

      const purchaseData = await purchaseResponse.json();

      if (!purchaseData.success) {
        throw new Error('Payment initialization failed');
      }

      // Store the purchase details for verification after payment
      // Use both sessionStorage AND localStorage for redundancy
      const purchaseInfo = {
        reference: purchaseData.reference,
        ticketTypeName: selectedTicket.name,
        ticketTypePrice: selectedTicket.price,
        email: emailStr,
        name: nameStr,
        whatsapp: whatsappStr,
        eventId: id,
        timestamp: Date.now(),
      };
      
      sessionStorage.setItem('pendingPurchase', JSON.stringify(purchaseInfo));
      localStorage.setItem('pendingPurchase', JSON.stringify(purchaseInfo));

      // Redirect to Paystack payment page
      if (purchaseData.paymentUrl) {
        window.location.href = purchaseData.paymentUrl;
      } else {
        throw new Error('No payment URL provided');
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: '120px', padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'red', fontSize: '18px' }}>Error: {error}</p>
        <button
          onClick={() => navigate('/events')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
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
    );
  }

  if (!event) {
    return (
      <div style={{ marginTop: '120px', padding: '20px', textAlign: 'center' }}>
        <p>Event not found</p>
        <button
          onClick={() => navigate('/events')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
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
    );
  }

  return (
    <div style={{ marginTop: '100px', minHeight: '100vh', paddingBottom: '40px' }}>
      <button
        onClick={() => navigate('/events')}
        style={{
          margin: '20px',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        &larr; Back to Events
      </button>

      <section className="section" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        {/* Event Header */}
        <div
          className="event-details-header-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            marginBottom: '40px',
            alignItems: 'start',
          }}
        >
          {/* Event Image */}
          <div>
            <img
              src={event.image}
              alt={event.title}
              style={{
                width: '100%',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              }}
            />
          </div>

          {/* Event Info */}
          <div>
            <h1 style={{ color: '#DAA520', marginBottom: '10px', fontFamily: 'Georgia, serif' }}>
              {event.title}
            </h1>
            <p style={{ fontSize: '18px', marginBottom: '15px', color: '#666' }}>
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              at {formatTime(event.time)}
            </p>
            <p style={{ fontSize: '16px', marginBottom: '10px' }}>
              <strong>Location:</strong> {event.location}
            </p>
            <p style={{ fontSize: '16px', marginBottom: '10px' }}>
              <strong>Category:</strong> {event.category}
            </p>
            <p style={{ fontSize: '16px', marginBottom: '10px' }}>
              <strong>Contact:</strong> {event.contactEmail}
            </p>
          </div>
        </div>

        {/* Event Description */}
        <div
          style={{
            backgroundColor: '#f9f9f9',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '40px',
            borderLeft: '4px solid #DAA520',
          }}
        >
          <h2 style={{ color: '#DAA520', marginBottom: '15px', fontFamily: 'Georgia, serif' }}>
            About This Event
          </h2>
          <p style={{ lineHeight: '1.8', color: '#333', whiteSpace: 'pre-line' }}>
            {event.description}
          </p>
        </div>

        {/* Tickets Section */}
        {event.hasTicketing && event.tickets && event.tickets.length > 0 ? (
          <div
            style={{
              backgroundColor: '#fff',
              padding: '30px',
              border: '2px solid #DAA520',
              borderRadius: '8px',
            }}
          >
            <h2 style={{ color: '#DAA520', marginBottom: '20px', fontFamily: 'Georgia, serif' }}>
              Get Your Tickets
            </h2>

            <form onSubmit={handlePurchase}>
              {/* Ticket Selection */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#333' }}>
                  Select Ticket Type *
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                  }}
                >
                  {event.tickets.map((ticket, index) => {
                    // Use ticket._id if available, otherwise use index
                    const ticketId = ticket._id ? String(ticket._id) : `ticket-${index}`;
                    return (
                    <label
                      key={ticketId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '15px',
                        border: selectedTicketId === ticketId ? '2px solid #DAA520' : '1px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor:
                          selectedTicketId === ticketId ? 'rgba(218, 165, 32, 0.1)' : 'white',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="ticket"
                        value={ticketId}
                        checked={selectedTicketId === ticketId}
                        onChange={() => {
                          console.log('Selected ticket:', ticketId, ticket);
                          setSelectedTicketId(ticketId);
                        }}
                        style={{ marginRight: '10px', cursor: 'pointer' }}
                      />
                      <div>
                        <p style={{ fontWeight: 'bold', color: '#333', margin: '0 0 5px 0' }}>
                          {ticket.name}
                        </p>
                        <p style={{ color: '#DAA520', fontWeight: 'bold', margin: 0 }}>
                          ₦{ticket.price.toLocaleString()}
                        </p>
                      </div>
                    </label>
                  );
                  })}
                </div>
              </div>

              {/* Personal Info */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#333' }}>
                  Your Information *
                </h3>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g., +234 123 456 7890"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: 'red', marginBottom: '15px', fontWeight: 'bold' }}>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: submitting ? '#ccc' : '#DAA520',
                  color: 'black',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.3s ease',
                }}
              >
                {submitting ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </form>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#f0f0f0',
              padding: '30px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '16px', color: '#666' }}>
              Ticket sales are not available for this event.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default EventDetails;

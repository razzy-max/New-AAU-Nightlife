import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';
import API_BASE_URL from '../config';

function AdminTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('paymentTime');

  // PDF Download state
  const [downloadingTicket, setDownloadingTicket] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const ticketCardRef = useRef(null);

  useEffect(() => {
    fetchTickets();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/events?admin=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');

      const params = new URLSearchParams();
      if (selectedEventId) params.append('eventId', selectedEventId);
      if (selectedStatus) params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`${API_BASE_URL}/api/tickets/admin/list?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('adminToken');

      const params = new URLSearchParams();
      if (selectedEventId) params.append('eventId', selectedEventId);
      if (selectedStatus) params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/api/tickets/admin/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export tickets');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tickets-${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error exporting tickets: ' + err.message);
    }
  };

  const handleFilterChange = () => {
    // Reset to page 1 and fetch new data
    fetchTickets();
  };

  const handleDownloadTicket = async (ticket) => {
    try {
      // Generate QR code
      const qrData = `${window.location.origin}/ticket/${ticket.ticketId}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 10,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCode(qrDataUrl);
      setDownloadingTicket(ticket);
    } catch (err) {
      alert('Error generating ticket PDF: ' + err.message);
    }
  };

  // Effect to trigger PDF download when ticket card is ready
  useEffect(() => {
    if (downloadingTicket && qrCode && ticketCardRef.current) {
      const element = ticketCardRef.current;
      const opt = {
        margin: 10,
        filename: `ticket-${downloadingTicket.ticketId}.pdf`,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setDownloadingTicket(null);
          setQrCode(null);
        });
    }
  }, [downloadingTicket, qrCode]);

  return (
    <div style={{ marginTop: '100px', minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Back Button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            &larr; Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="admin-header">
          <h1>🎟️ Ticket Sales Dashboard</h1>
        </div>

        {/* Filters */}
        <div
          style={{
            backgroundColor: '#f9f9f9',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #DAA520',
          }}
        >
          <h3 style={{ color: '#DAA520', marginTop: '0', fontFamily: 'Georgia, serif' }}>
            Filters
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '15px',
              marginBottom: '15px',
            }}
          >
            {/* Event Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                <option value="">All Events</option>
                {events.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Payment Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                <option value="paymentTime">Payment Time (Newest)</option>
                <option value="name">Buyer Name</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
            {/* Start Date */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontFamily: 'Arial, sans-serif',
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontFamily: 'Arial, sans-serif',
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleFilterChange}
              style={{
                padding: '10px 20px',
                backgroundColor: '#DAA520',
                color: 'black',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setSelectedEventId('');
                setSelectedStatus('');
                setStartDate('');
                setEndDate('');
                setSortBy('paymentTime');
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Clear Filters
            </button>
            <button
              onClick={handleExport}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              📊 Export to CSV
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '5px',
              padding: '15px',
              marginBottom: '20px',
              color: '#721c24',
            }}
          >
            Error: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner"></div>
            <p>Loading tickets...</p>
          </div>
        )}

        {/* Tickets Table */}
        {!loading && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #ddd',
            }}
          >
            {tickets.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#DAA520', color: 'black' }}>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>
                        Ticket ID
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>
                        Event
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>
                        Buyer Name
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>
                        Email
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>
                        WhatsApp
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>
                        Ticket Type
                      </th>
                      <th style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>
                        Price (₦)
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>
                        Payment Time
                      </th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                        Status
                      </th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket, index) => (
                      <tr
                        key={ticket._id}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        <td
                          style={{
                            padding: '15px',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            color: '#DAA520',
                          }}
                        >
                          {ticket.ticketId}
                        </td>
                        <td style={{ padding: '15px' }}>{ticket.eventTitle}</td>
                        <td style={{ padding: '15px' }}>{ticket.name}</td>
                        <td style={{ padding: '15px' }}>{ticket.email}</td>
                        <td style={{ padding: '15px' }}>{ticket.whatsapp}</td>
                        <td style={{ padding: '15px' }}>{ticket.ticketTypeName}</td>
                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>
                          ₦{ticket.ticketTypePrice.toLocaleString()}
                        </td>
                        <td style={{ padding: '15px', fontSize: '13px' }}>
                          {ticket.paymentTime
                            ? new Date(ticket.paymentTime).toLocaleString('en-NG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor:
                                ticket.paymentStatus === 'completed'
                                  ? '#d4edda'
                                  : ticket.paymentStatus === 'pending'
                                  ? '#fff3cd'
                                  : '#f8d7da',
                              color:
                                ticket.paymentStatus === 'completed'
                                  ? '#155724'
                                  : ticket.paymentStatus === 'pending'
                                  ? '#856404'
                                  : '#721c24',
                            }}
                          >
                            {ticket.paymentStatus.charAt(0).toUpperCase() +
                              ticket.paymentStatus.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDownloadTicket(ticket)}
                            disabled={downloadingTicket?._id === ticket._id}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: downloadingTicket?._id === ticket._id ? '#6c757d' : '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: downloadingTicket?._id === ticket._id ? 'wait' : 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold',
                            }}
                          >
                            {downloadingTicket?._id === ticket._id ? '⏳' : '📥'} PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <p>No tickets found. Try adjusting your filters.</p>
              </div>
            )}

            {/* Summary Footer */}
            {tickets.length > 0 && (
              <div
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: '15px',
                  borderTop: '1px solid #ddd',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>
                    Total Tickets
                  </p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#DAA520' }}>
                    {tickets.length}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>
                    Total Revenue
                  </p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#DAA520' }}>
                    ₦{tickets.reduce((sum, t) => sum + t.ticketTypePrice, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>
                    Completed Payments
                  </p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                    {tickets.filter((t) => t.paymentStatus === 'completed').length}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden Ticket Card for PDF Generation */}
        {downloadingTicket && qrCode && (
          <div
            style={{
              position: 'absolute',
              left: '-9999px',
              top: 0,
            }}
          >
            <div
              ref={ticketCardRef}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '3px solid #DAA520',
                width: '500px',
              }}
            >
              {/* Ticket Header */}
              <div
                style={{
                  backgroundColor: '#DAA520',
                  padding: '20px',
                  textAlign: 'center',
                  color: 'black',
                }}
              >
                <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '28px' }}>
                  EVENT TICKET
                </h1>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                  {new Date().toLocaleDateString()}
                </p>
              </div>

              {/* Ticket Content */}
              <div style={{ padding: '30px' }}>
                {/* Event Info */}
                <div style={{ marginBottom: '25px' }}>
                  <h2
                    style={{
                      color: '#DAA520',
                      fontSize: '22px',
                      margin: '0 0 10px 0',
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    {downloadingTicket.eventTitle}
                  </h2>
                  <p style={{ color: '#666', margin: '0 0 10px 0' }}>
                    <strong>Date & Time:</strong>{' '}
                    {downloadingTicket.eventDate
                      ? new Date(downloadingTicket.eventDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'TBA'}{' '}
                    {downloadingTicket.eventTime ? `at ${downloadingTicket.eventTime}` : ''}
                  </p>
                  <p style={{ color: '#666', margin: '0 0 10px 0' }}>
                    <strong>Venue:</strong> {downloadingTicket.location || 'TBA'}
                  </p>
                  <p style={{ color: '#DAA520', fontWeight: 'bold', margin: '0' }}>
                    <strong>Ticket Type:</strong> {downloadingTicket.ticketTypeName}
                  </p>
                </div>

                {/* Ticket ID and QR Code */}
                <div
                  style={{
                    backgroundColor: '#f9f9f9',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '25px',
                    textAlign: 'center',
                    borderTop: '1px solid #DAA520',
                    borderBottom: '1px solid #DAA520',
                  }}
                >
                  {/* QR Code */}
                  <div style={{ marginBottom: '20px' }}>
                    <img
                      src={qrCode}
                      alt="QR Code"
                      style={{
                        width: '150px',
                        height: '150px',
                        margin: '0 auto',
                        display: 'block',
                        border: '2px solid #ddd',
                        padding: '5px',
                        borderRadius: '5px',
                      }}
                    />
                  </div>

                  {/* Ticket ID */}
                  <div>
                    <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>
                      TICKET ID
                    </p>
                    <p
                      style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#333',
                        margin: 0,
                        fontFamily: 'monospace',
                        letterSpacing: '2px',
                      }}
                    >
                      {downloadingTicket.ticketId}
                    </p>
                  </div>
                </div>

                {/* Buyer Info */}
                <div style={{ borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                  <p style={{ color: '#333', margin: '0 0 10px 0' }}>
                    <strong>Ticket Holder:</strong> {downloadingTicket.name}
                  </p>
                  <p style={{ color: '#333', margin: '0 0 10px 0' }}>
                    <strong>Email:</strong> {downloadingTicket.email}
                  </p>
                  <p style={{ color: '#333', margin: '0 0 10px 0' }}>
                    <strong>WhatsApp:</strong> {downloadingTicket.whatsapp}
                  </p>
                  <p style={{ color: '#333', margin: '0' }}>
                    <strong>Price Paid:</strong> ₦{downloadingTicket.ticketTypePrice.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Ticket Footer */}
              <div
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: '15px',
                  textAlign: 'center',
                  borderTop: '1px solid #ddd',
                  fontSize: '12px',
                  color: '#666',
                }}
              >
                <p style={{ margin: 0 }}>
                  Present your ticket at the venue (either printed or on your phone).
                </p>
                <p style={{ margin: '5px 0 0 0' }}>
                  {downloadingTicket.eventDate
                    ? `Valid for ${new Date(downloadingTicket.eventDate).toLocaleDateString()}`
                    : 'Check event details for date'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminTickets;

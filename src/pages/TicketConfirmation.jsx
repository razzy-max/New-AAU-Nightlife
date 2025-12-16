import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';
import API_BASE_URL from '../config';

function TicketConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const canvasRef = useRef(null);
  const ticketCardRef = useRef(null);

  useEffect(() => {
    // Add print styles
    const printStyle = document.createElement('style');
    printStyle.textContent = `
      @media print {
        body {
          margin: 0;
          padding: 0;
          background: white;
        }
        
        /* Hide non-printable elements */
        .no-print {
          display: none !important;
        }
        
        /* Ensure ticket card is visible and properly formatted */
        #ticket-card {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
          background-color: white !important;
          border: 3px solid #DAA520 !important;
        }
        
        /* Ensure all content inside ticket is visible */
        #ticket-card * {
          display: inherit !important;
          visibility: visible !important;
          opacity: 1 !important;
          background-color: inherit !important;
          color: inherit !important;
        }
        
        /* Container holding ticket */
        div[style*="maxWidth: '600px'"] {
          max-width: 100% !important;
          padding: 0 !important;
        }
        
        /* Remove background from page container */
        div[style*="backgroundColor: '#f5f5f5'"] {
          background-color: white !important;
        }
      }
    `;
    document.head.appendChild(printStyle);

    return () => {
      if (printStyle && printStyle.parentNode) {
        printStyle.parentNode.removeChild(printStyle);
      }
    };
  }, []);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tickets/${id}`);
        if (!response.ok) throw new Error('Failed to load ticket');
        const data = await response.json();
        setTicket(data);

        // Generate QR code
        const qrData = `${window.location.origin}/ticket/${data.ticketId}`;
        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 10,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrCode(qrDataUrl);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  const downloadPDF = () => {
    if (!ticketCardRef.current) return;

    const element = ticketCardRef.current;
    const opt = {
      margin: 10,
      filename: `ticket-${ticket.ticketId}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    };

    html2pdf().set(opt).from(element).save();
  };

  const printPDF = () => {
    if (!ticketCardRef.current) return;

    const element = ticketCardRef.current;
    const opt = {
      margin: 10,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    };

    // Generate PDF and open in new window for printing
    html2pdf()
      .set(opt)
      .from(element)
      .outputPdf('blob')
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url);
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            printWindow.print();
          });
        } else {
          // Fallback: download if window.open fails
          const a = document.createElement('a');
          a.href = url;
          a.download = `ticket-${ticket.ticketId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading ticket...</p>
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

  if (!ticket) {
    return (
      <div style={{ marginTop: '120px', padding: '20px', textAlign: 'center' }}>
        <p>Ticket not found</p>
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
    <div style={{ marginTop: '100px', minHeight: '100vh', paddingBottom: '40px', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        {/* Success Message */}
        <div
          className="no-print"
          style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '30px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: '#155724', marginBottom: '10px', fontFamily: 'Georgia, serif' }}>
            ✓ Ticket Booked Successfully!
          </h2>
          <p style={{ color: '#155724', margin: 0 }}>
            Your payment has been confirmed. Show this ticket at the venue.
          </p>
        </div>

        {/* Ticket Card */}
        <div
          ref={ticketCardRef}
          id="ticket-card"
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            marginBottom: '30px',
            border: '3px solid #DAA520',
            pageBreakInside: 'avoid',
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
                {ticket.eventTitle}
              </h2>
              <p style={{ color: '#666', margin: '0 0 10px 0' }}>
                <strong>Date & Time:</strong>{' '}
                {new Date(ticket.eventDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at {ticket.eventTime}
              </p>
              <p style={{ color: '#666', margin: '0 0 10px 0' }}>
                <strong>Venue:</strong> {ticket.location}
              </p>
              <p style={{ color: '#DAA520', fontWeight: 'bold', margin: '0' }}>
                <strong>Ticket Type:</strong> {ticket.ticketTypeName}
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
              {qrCode && (
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
              )}

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
                  {ticket.ticketId}
                </p>
              </div>
            </div>

            {/* Buyer Info */}
            <div style={{ borderTop: '1px solid #ddd', paddingTop: '20px' }}>
              <p style={{ color: '#333', margin: '0 0 10px 0' }}>
                <strong>Ticket Holder:</strong> {ticket.name}
              </p>
              <p style={{ color: '#333', margin: '0 0 10px 0' }}>
                <strong>Email:</strong> {ticket.email}
              </p>
              <p style={{ color: '#333', margin: '0 0 10px 0' }}>
                <strong>WhatsApp:</strong> {ticket.whatsapp}
              </p>
              <p style={{ color: '#333', margin: '0' }}>
                <strong>Price Paid:</strong> ₦{ticket.ticketTypePrice.toLocaleString()}
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
             Present your ticket at the venue (either printed or on your phone). Screenshot or print this page.
            </p>
            <p style={{ margin: '5px 0 0 0' }}>
              Valid for {new Date(ticket.eventDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="no-print"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={printPDF}
            style={{
              padding: '12px',
              backgroundColor: '#DAA520',
              color: 'black',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#B8860B')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#DAA520')}
          >
            🖨️ Print Ticket
          </button>
          <button
            onClick={downloadPDF}
            style={{
              padding: '12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#c82333')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc3545')}
          >
            📥 Download PDF
          </button>
          <button
            onClick={() => navigate('/events')}
            style={{
              padding: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#007bff')}
          >
            Browse Events
          </button>
        </div>

        {/* Info Box */}
        <div
          style={{
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '5px',
            padding: '15px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#004085',
          }}
        >
          <strong>💡 Tip:</strong> Save or screenshot this ticket. You can show it from your phone or print it at the venue.
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          div:not(#ticket-card) {
            display: none !important;
          }
          #ticket-card {
            box-shadow: none;
            margin: 0;
            max-width: 100%;
            border: 1px solid #000;
          }
        }
      `}</style>
    </div>
  );
}

export default TicketConfirmation;

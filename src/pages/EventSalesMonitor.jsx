import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import API_BASE_URL from '../config';

function EventSalesMonitor() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const accessToken = searchParams.get('access') || '';

  const [eventInfo, setEventInfo] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'paymentTime');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('access', accessToken);
    if (selectedStatus) params.set('status', selectedStatus);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (sortBy) params.set('sortBy', sortBy);
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [accessToken, selectedStatus, startDate, endDate, sortBy, search]);

  useEffect(() => {
    if (!accessToken) {
      setError('This sales monitor link is missing an access token.');
      setLoading(false);
      return;
    }

    const fetchSalesData = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/sales-monitor?${queryString}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load sales monitor');
        }

        setEventInfo(data.event || null);
        setTickets(data.tickets || []);
      } catch (err) {
        setError(err.message || 'Failed to load sales monitor');
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [eventId, queryString, accessToken]);

  const totalRevenue = tickets.reduce((sum, item) => sum + Number(item.ticketTypePrice || 0), 0);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('access', accessToken);
    if (selectedStatus) params.set('status', selectedStatus);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (sortBy) params.set('sortBy', sortBy);
    if (search.trim()) params.set('search', search.trim());
    setSearchParams(params);
  };

  const resetFilters = () => {
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
    setSortBy('paymentTime');
    setSearch('');
    setSearchParams({ access: accessToken });
  };

  const handleExportCsv = () => {
    window.location.href = `${API_BASE_URL}/api/events/${eventId}/sales-monitor/export.csv?${queryString}`;
  };

  const handleExportPdf = () => {
    window.location.href = `${API_BASE_URL}/api/events/${eventId}/sales-monitor/export.pdf?${queryString}`;
  };

  return (
    <div style={{ marginTop: '100px', minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Back to Home
          </button>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={handleExportCsv} style={{ padding: '10px 16px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Export CSV
            </button>
            <button onClick={handleExportPdf} style={{ padding: '10px 16px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Export PDF
            </button>
          </div>
        </div>

        <div className="admin-header" style={{ marginBottom: '20px' }}>
          <h1 style={{ marginBottom: '6px' }}>Event Ticket Sales Monitor</h1>
          {eventInfo && (
            <p style={{ margin: 0, color: '#666' }}>
              {eventInfo.title} | {new Date(eventInfo.date).toLocaleDateString()} {eventInfo.time ? `at ${eventInfo.time}` : ''}
            </p>
          )}
        </div>

        <div style={{ backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
              <option value="paymentTime">Newest First</option>
              <option value="paymentTimeAsc">Oldest First</option>
              <option value="name">Buyer Name</option>
              <option value="ticketTypeName">Ticket Type</option>
              <option value="paymentStatus">Payment Status</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, ticket ID"
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <button onClick={applyFilters} style={{ padding: '9px 14px', backgroundColor: '#DAA520', color: '#111', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
              Apply Filters
            </button>
            <button onClick={resetFilters} style={{ padding: '9px 14px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
              Reset
            </button>
          </div>
        </div>

        {loading && <div className="admin-loading">Loading ticket sales...</div>}
        {error && <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '14px' }}>{error}</div>}

        {!loading && !error && (
          <>
            <div className="admin-stats" style={{ marginBottom: '20px' }}>
              <div className="stat-card"><h3>{tickets.length}</h3><p>Tickets Sold</p></div>
              <div className="stat-card"><h3>N{totalRevenue.toLocaleString()}</h3><p>Total Revenue</p></div>
            </div>

            <div className="subscribers-table">
              <table>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Buyer Name</th>
                    <th>Email</th>
                    <th>WhatsApp</th>
                    <th>Ticket Type</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Payment Time</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '18px' }}>No ticket sales found</td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr key={ticket._id}>
                        <td>{ticket.ticketId}</td>
                        <td>{ticket.name}</td>
                        <td>{ticket.email}</td>
                        <td>{ticket.whatsapp || '-'}</td>
                        <td>{ticket.ticketTypeName}</td>
                        <td>N{Number(ticket.ticketTypePrice || 0).toLocaleString()}</td>
                        <td>{ticket.paymentStatus}</td>
                        <td>{ticket.paymentTime ? new Date(ticket.paymentTime).toLocaleString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EventSalesMonitor;

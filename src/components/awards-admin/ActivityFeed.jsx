import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import './awards-admin.css';

function ActivityFeed({ eventId, authHeaders }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchActivity = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}/activity`, {
          headers: { ...authHeaders },
        });
        const result = await response.json();
        if (!cancelled && result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (loading) {
    return <p>Loading activity...</p>;
  }

  if (!data) {
    return <p>Could not load activity data.</p>;
  }

  const { totals, recentVotes } = data;

  return (
    <div className="admin-tab-content" style={{ gridTemplateColumns: '1fr' }}>
      <div className="admin-list-section">
        <h2>Activity Overview</h2>
        <div className="activity-stats-grid">
          <div className="activity-stat-tile">
            <div className="activity-stat-value">{totals.totalVotes.toLocaleString()}</div>
            <div className="activity-stat-label">Total Votes</div>
          </div>
          <div className="activity-stat-tile">
            <div className="activity-stat-value">{totals.freeVotes.toLocaleString()}</div>
            <div className="activity-stat-label">Free Votes</div>
          </div>
          <div className="activity-stat-tile">
            <div className="activity-stat-value">{totals.paidVotes.toLocaleString()}</div>
            <div className="activity-stat-label">Paid Votes</div>
          </div>
          <div className="activity-stat-tile">
            <div className="activity-stat-value">₦{totals.revenue.toLocaleString()}</div>
            <div className="activity-stat-label">Revenue</div>
          </div>
        </div>
      </div>

      <div className="admin-list-section" style={{ marginTop: '2rem' }}>
        <h2>Recent Votes</h2>
        {recentVotes.length > 0 ? (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Weight</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentVotes.map((vote) => (
                  <tr key={vote._id}>
                    <td>{vote.candidate?.name || 'Unknown'}</td>
                    <td>{vote.category?.name || 'Unknown'}</td>
                    <td>
                      <span className={`type-badge ${vote.voteType}`}>
                        {vote.voteType === 'paid' ? '💰 Paid' : '🆓 Free'}
                      </span>
                    </td>
                    <td>{vote.voteWeight}</td>
                    <td>{new Date(vote.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No votes recorded yet.</p>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;

import React from 'react';
import './Leaderboard.css';

const Leaderboard = ({ candidates, category }) => {
  const totalVotes = category?.totalVotes || 0;

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>🏆 Live Leaderboard</h2>
        <div className="total-votes">Total Votes: {totalVotes.toLocaleString()}</div>
      </div>

      <div className="leaderboard-content">
        {candidates && candidates.length > 0 ? (
          <div className="leaderboard-list">
            {candidates.map((candidate, index) => {
              const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0;
              const medalEmoji =
                index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '✨';

              return (
                <div key={candidate._id} className={`leaderboard-item rank-${index + 1}`}>
                  <div className="rank-section">
                    <span className="medal">{medalEmoji}</span>
                    <span className="rank-number">#{index + 1}</span>
                  </div>

                  <div className="candidate-section">
                    <div className="candidate-main">
                      <h4 className="candidate-name">{candidate.name}</h4>
                      <div className="vote-stats">
                        {category?.pricingType === 'paid' ? (
                          <span className="paid-votes">
                            💰 {candidate.paidVotes || 0} votes
                          </span>
                        ) : (
                          <span className="free-votes">
                            🆓 {candidate.freeVotes || 0} votes
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="progress-section">
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="percentage-text">
                        <span className="vote-count">{candidate.voteCount}</span>
                        <span className="percentage">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {index === 0 && <div className="leading-indicator">Leading</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>No votes yet. Be the first to vote!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;

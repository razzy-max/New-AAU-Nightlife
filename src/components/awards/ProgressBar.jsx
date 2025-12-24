import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ candidate, totalVotes }) => {
  const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <div className="candidate-info">
          <h4 className="candidate-name">{candidate.name}</h4>
          <span className="vote-count">{candidate.voteCount} votes</span>
        </div>
        <span className="percentage">{percentage.toFixed(1)}%</span>
      </div>
      <div className="progress-bar-background">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        >
          <span className="progress-text">{percentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

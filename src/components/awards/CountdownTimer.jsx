import React, { useState, useEffect } from 'react';
import './CountdownTimer.css';

const CountdownTimer = ({ startDate, endDate, onStatusChange }) => {
  const [timeData, setTimeData] = useState({
    status: 'upcoming',
    timeRemaining: '',
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();

      let status = 'upcoming';
      let targetTime = start;

      if (now >= end) {
        status = 'ended';
        targetTime = end;
      } else if (now >= start) {
        status = 'active';
        targetTime = end;
      }

      const difference = targetTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeData({
          status,
          timeRemaining: `${days}d ${hours}h ${minutes}m ${seconds}s`,
          days,
          hours,
          minutes,
          seconds,
        });
      } else {
        setTimeData((prev) => ({
          ...prev,
          status,
          timeRemaining: status === 'ended' ? 'Voting Ended' : 'Starting Soon',
        }));
      }

      if (onStatusChange) {
        onStatusChange(status);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [startDate, endDate, onStatusChange]);

  return (
    <div className={`countdown-timer ${timeData.status}`}>
      <div className="countdown-content">
        <div className="status-badge">{timeData.status.toUpperCase()}</div>

        {timeData.status !== 'ended' && (
          <div className="countdown-display">
            <div className="time-unit">
              <div className="time-value">{timeData.days}</div>
              <div className="time-label">Days</div>
            </div>
            <div className="time-separator">:</div>
            <div className="time-unit">
              <div className="time-value">{String(timeData.hours).padStart(2, '0')}</div>
              <div className="time-label">Hours</div>
            </div>
            <div className="time-separator">:</div>
            <div className="time-unit">
              <div className="time-value">{String(timeData.minutes).padStart(2, '0')}</div>
              <div className="time-label">Minutes</div>
            </div>
            <div className="time-separator">:</div>
            <div className="time-unit">
              <div className="time-value">{String(timeData.seconds).padStart(2, '0')}</div>
              <div className="time-label">Seconds</div>
            </div>
          </div>
        )}

        <div className="countdown-text">
          {timeData.status === 'upcoming' && '⏰ Voting Starts Soon'}
          {timeData.status === 'active' && '🎉 Voting is Live!'}
          {timeData.status === 'ended' && '⏹️ Voting Has Ended'}
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;

import React, { useEffect } from 'react';
import './VoteToast.css';

function VoteToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className={`vote-toast ${isSuccess ? 'success' : 'error'}`} role="status">
      <div className="vote-toast-icon">
        {isSuccess ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 12.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="vote-toast-body">
        <p className="vote-toast-title">{isSuccess ? 'Vote cast!' : 'Something went wrong'}</p>
        <p className="vote-toast-message">{toast.message}</p>
      </div>
      <button className="vote-toast-close" onClick={onDismiss} aria-label="Dismiss">✕</button>
      {isSuccess && <div className="vote-toast-progress" />}
    </div>
  );
}

export default VoteToast;

import { useEffect, useCallback } from 'react';

/**
 * Custom hook for Server-Sent Events (SSE)
 * Handles real-time vote updates from the server
 *
 * @param {Function} onVoteUpdate - Callback function when vote update is received
 * @param {string} apiBaseUrl - Base URL for API
 * @param {string|null} eventId - Awards event to scope this connection to
 * @returns {Function} cleanup function
 */
export const useVoteUpdates = (onVoteUpdate, apiBaseUrl, eventId = null) => {
  useEffect(() => {
    if (!onVoteUpdate || !apiBaseUrl) {
      console.warn('[SSE Hook] Missing required parameters');
      return;
    }

    let eventSource = null;
    let reconnectTimeout = null;

    const setupSSE = () => {
      try {
        console.log('[SSE] Connecting to vote updates...');

        // Create EventSource connection, optionally scoped to one awards event
        const url = eventId
          ? `${apiBaseUrl}/api/voting/updates?eventId=${eventId}`
          : `${apiBaseUrl}/api/voting/updates`;
        eventSource = new EventSource(url);

        // Handle incoming messages
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[SSE] Received:', data.type);

            // Handle different message types
            switch (data.type) {
              case 'connection':
                console.log('[SSE] Connected to server');
                break;

              case 'vote-update':
                if (data.candidate) {
                  onVoteUpdate(data.candidate);
                }
                break;

              default:
                console.log('[SSE] Unknown message type:', data.type);
            }
          } catch (err) {
            console.error('[SSE] Error parsing message:', err);
          }
        };

        // Handle connection errors
        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);

          // Check if connection is really closed
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('[SSE] Connection closed by server');
            eventSource.close();
            eventSource = null;

            // Attempt to reconnect after 3 seconds
            console.log('[SSE] Attempting to reconnect in 3 seconds...');
            reconnectTimeout = setTimeout(setupSSE, 3000);
          }
        };
      } catch (err) {
        console.error('[SSE] Setup error:', err);

        // Fallback: retry connection
        reconnectTimeout = setTimeout(setupSSE, 3000);
      }
    };

    // Initial connection
    setupSSE();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        console.log('[SSE] Closing connection');
        eventSource.close();
      }
    };
  }, [onVoteUpdate, apiBaseUrl, eventId]);
};

export default useVoteUpdates;

/**
 * Server-Sent Events (SSE) Service
 * Manages real-time vote updates to all connected clients
 */

class SSEService {
  constructor() {
    this.clients = new Map(); // Map of clientId -> response object
    this.clientCounter = 0;
  }

  /**
   * Register a new SSE client
   * @param {Response} res - Express response object
   * @param {string|null} eventId - Awards event this client is watching, if any
   * @returns {string} clientId
   */
  registerClient(res, eventId = null) {
    const clientId = `client-${Date.now()}-${++this.clientCounter}`;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Store the client
    this.clients.set(clientId, { res, eventId });

    console.log(`[SSE] Client ${clientId} connected. Total clients: ${this.clients.size}`);

    // Handle client disconnect
    res.on('close', () => {
      this.unregisterClient(clientId);
    });

    res.on('error', (err) => {
      console.error(`[SSE] Client ${clientId} error:`, err.message);
      this.unregisterClient(clientId);
    });

    // Send initial connection message
    this.sendToClient(clientId, { type: 'connection', message: 'Connected to vote updates' });

    return clientId;
  }

  /**
   * Unregister a disconnected client
   * @param {string} clientId
   */
  unregisterClient(clientId) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(`[SSE] Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
    }
  }

  /**
   * Send message to a specific client
   * @param {string} clientId
   * @param {object} data
   */
  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client?.res && !client.res.writableEnded) {
      try {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error(`[SSE] Error sending to client ${clientId}:`, err.message);
        this.unregisterClient(clientId);
      }
    }
  }

  /**
   * Broadcast message to connected clients, optionally scoped to one awards event.
   * A client with no eventId (watching nothing in particular) still receives everything;
   * a client watching a specific eventId only receives matching broadcasts.
   * @param {object} data
   * @param {string|null} eventId
   */
  broadcast(data, eventId = null) {
    const timestamp = new Date().toISOString();
    const message = { ...data, timestamp };

    let successCount = 0;
    let failCount = 0;

    this.clients.forEach(({ res, eventId: clientEventId }, clientId) => {
      if (eventId && clientEventId && String(clientEventId) !== String(eventId)) {
        return;
      }
      if (res && !res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify(message)}\n\n`);
          successCount++;
        } catch (err) {
          console.error(`[SSE] Error broadcasting to client ${clientId}:`, err.message);
          this.unregisterClient(clientId);
          failCount++;
        }
      }
    });

    if (successCount > 0) {
      console.log(`[SSE] Broadcasted to ${successCount} clients${failCount > 0 ? `, ${failCount} failed` : ''}`);
    }
  }

  /**
   * Broadcast vote update
   * @param {object} candidateData - Updated candidate data
   * @param {string|null} eventId - Awards event the vote belongs to
   */
  broadcastVoteUpdate(candidateData, eventId = null) {
    this.broadcast({
      type: 'vote-update',
      candidate: candidateData,
    }, eventId);
  }

  /**
   * Get total connected clients
   * @returns {number}
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Clear all clients (useful on shutdown)
   */
  clearAllClients() {
    this.clients.forEach(({ res }) => {
      if (res && !res.writableEnded) {
        try {
          res.end();
        } catch (err) {
          console.error('[SSE] Error clearing client:', err.message);
        }
      }
    });
    this.clients.clear();
    console.log('[SSE] All clients cleared');
  }
}

// Create singleton instance
const sseService = new SSEService();

export default sseService;

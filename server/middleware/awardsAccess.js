import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AwardsEvent from '../models/AwardsEvent.js';
import { resolveEventByIdOrSlug } from '../utils/resolveEvent.js';

// Mirrors validateSalesAccess in server/routes/events.js, but for a write-capable token.
// awardsEventIdOrSlug accepts either the real ObjectId or the event's slug, since the
// organizer link shared with faculty organizers uses the slug in its URL.
export const validateOrganizerAccess = async (awardsEventIdOrSlug, token) => {
  if (!token) {
    return { ok: false, status: 401, message: 'Missing organizer access token' };
  }

  const event = await resolveEventByIdOrSlug(AwardsEvent, awardsEventIdOrSlug, '+organizerAccessToken');
  if (!event) {
    return { ok: false, status: 404, message: 'Awards event not found' };
  }

  if (!event.organizerAccessToken || event.organizerAccessToken !== token) {
    return { ok: false, status: 403, message: 'Invalid or revoked organizer link' };
  }

  return { ok: true, event };
};

// Accepts EITHER a superadmin JWT OR a per-event organizer token (X-Organizer-Access header).
// Both paths converge on req.awardsEvent so route handlers are written once for both callers.
export const requireEventAccess = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const authHeader = req.headers.authorization || '';

    if (authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user?.role === 'admin') {
          const event = await resolveEventByIdOrSlug(AwardsEvent, eventId);
          if (!event) {
            return res.status(404).json({ success: false, message: 'Awards event not found' });
          }
          req.awardsEvent = event;
          req.isSuperadmin = true;
          return next();
        }
      } catch {
        // fall through to organizer token check
      }
    }

    const orgToken = req.headers['x-organizer-access'];
    const access = await validateOrganizerAccess(eventId, orgToken);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    req.awardsEvent = access.event;
    req.isSuperadmin = false;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

import express from 'express';
import { body, validationResult } from 'express-validator';
import Vote from '../models/Vote.js';
import Candidate from '../models/Candidate.js';
import Category from '../models/Category.js';
import AwardsEvent from '../models/AwardsEvent.js';
import { verifyCaptcha } from '../services/captchaService.js';
import sseService from '../services/sseService.js';

const router = express.Router();

// Helper function to get client IP
const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Helper function to check vote eligibility
const checkVoteEligibility = async (awardsEventId, ipAddress, sessionId, categoryId, voteType) => {
  if (voteType === 'free') {
    const existingVote = await Vote.findOne({
      awardsEvent: awardsEventId,
      ipAddress,
      sessionId,
      category: categoryId,
      voteType: 'free',
    });

    if (existingVote) {
      return { eligible: false, reason: 'You have already voted once in this category' };
    }
  }

  return { eligible: true };
};

// A category's own status is the manual override; the event's voting window is the outer gate
export const checkEventVotingWindow = (awardsEvent) => {
  if (!awardsEvent.published) {
    return { ok: false, message: 'This awards event is not currently accepting votes' };
  }
  const now = new Date();
  if (now < new Date(awardsEvent.votingStartsAt)) {
    return { ok: false, message: 'Voting has not started for this event yet' };
  }
  if (now > new Date(awardsEvent.votingEndsAt)) {
    return { ok: false, message: 'Voting has ended for this event' };
  }
  return { ok: true };
};

// ============ SERVER-SENT EVENTS (SSE) ============

// GET SSE connection for real-time vote updates, optionally scoped to one event
router.get('/updates', (req, res) => {
  try {
    sseService.registerClient(res, req.query.eventId || null);
  } catch (error) {
    console.error('SSE connection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET current SSE client count (for monitoring)
router.get('/stats/connections', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        connectedClients: sseService.getClientCount(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ FREE VOTING ============

// POST free vote with CAPTCHA
router.post(
  '/vote/free',
  [
    body('candidateId').notEmpty().withMessage('Candidate ID is required'),
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('captchaToken').notEmpty().withMessage('CAPTCHA token is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { candidateId, categoryId, captchaToken } = req.body;
      const ipAddress = getClientIP(req);
      const sessionId = req.headers['x-session-id'] || 'anonymous';

      // Skip CAPTCHA verification for free voting (confirmation-based)
      // If captchaToken is 'no-captcha-free', that means user confirmed via browser dialog
      if (captchaToken !== 'no-captcha-free') {
        const captchaResult = await verifyCaptcha(captchaToken);
        if (!captchaResult.success) {
          return res.status(400).json({
            success: false,
            message: 'CAPTCHA verification failed',
          });
        }
      }

      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      const awardsEvent = await AwardsEvent.findById(category.awardsEvent);
      if (!awardsEvent) {
        return res.status(404).json({ success: false, message: 'Awards event not found' });
      }

      const windowCheck = checkEventVotingWindow(awardsEvent);
      if (!windowCheck.ok) {
        return res.status(400).json({ success: false, message: windowCheck.message });
      }

      if (category.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Voting is ${category.status}`,
        });
      }

      if (category.pricingType !== 'free') {
        return res.status(400).json({
          success: false,
          message: 'This category requires paid voting',
        });
      }

      const eligibility = await checkVoteEligibility(awardsEvent._id, ipAddress, sessionId, categoryId, 'free');
      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.reason,
        });
      }

      const vote = new Vote({
        candidate: candidateId,
        category: categoryId,
        awardsEvent: awardsEvent._id,
        ipAddress,
        sessionId,
        voteType: 'free',
        voteWeight: 1,
        captchaToken,
      });

      await vote.save();

      const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        { $inc: { voteCount: 1, freeVotes: 1 } },
        { new: true }
      );

      await Category.findByIdAndUpdate(categoryId, {
        $inc: { totalVotes: 1 },
      });

      sseService.broadcastVoteUpdate(updatedCandidate, awardsEvent._id);

      res.status(201).json({
        success: true,
        message: 'Vote recorded successfully',
        data: {
          voteId: vote._id,
          voteType: 'free',
        },
      });
    } catch (error) {
      console.error('Free voting error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============ LEADERBOARD ============

// GET leaderboard for a category
router.get('/leaderboard/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 10 } = req.query;

    const candidates = await Candidate.find({ category: categoryId })
      .sort('-voteCount')
      .limit(parseInt(limit));

    const category = await Category.findById(categoryId);

    res.status(200).json({
      success: true,
      data: {
        category,
        candidates: candidates.map((candidate, index) => ({
          ...candidate._doc,
          rank: index + 1,
          percentage:
            category.totalVotes > 0
              ? ((candidate.voteCount / category.totalVotes) * 100).toFixed(2)
              : 0,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;

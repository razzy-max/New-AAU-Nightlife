import express from 'express';
import { body, validationResult } from 'express-validator';
import Vote from '../models/Vote.js';
import Candidate from '../models/Candidate.js';
import Category from '../models/Category.js';
import { verifyCaptcha } from '../services/captchaService.js';
import { verifyPayment } from '../services/paystackService.js';
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
const checkVoteEligibility = async (ipAddress, sessionId, categoryId, voteType) => {
  if (voteType === 'free') {
    // Check if user has already voted in this category for free
    const existingVote = await Vote.findOne({
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

// ============ SERVER-SENT EVENTS (SSE) ============

// GET SSE connection for real-time vote updates
router.get('/updates', (req, res) => {
  try {
    sseService.registerClient(res);
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
        // For actual CAPTCHA tokens, verify them
        const captchaResult = await verifyCaptcha(captchaToken);
        if (!captchaResult.success) {
          return res.status(400).json({
            success: false,
            message: 'CAPTCHA verification failed',
          });
        }
      }

      // Check vote eligibility
      const eligibility = await checkVoteEligibility(ipAddress, sessionId, categoryId, 'free');
      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.reason,
        });
      }

      // Verify candidate and category exist
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      // Check category is active
      if (category.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Voting is ${category.status}`,
        });
      }

      // Check category is free voting type
      if (category.pricingType !== 'free') {
        return res.status(400).json({
          success: false,
          message: 'This category requires paid voting',
        });
      }

      // Create vote record
      const vote = new Vote({
        candidate: candidateId,
        category: categoryId,
        ipAddress,
        sessionId,
        voteType: 'free',
        voteWeight: 1,
        captchaToken,
      });

      await vote.save();

      // Update candidate vote count
      const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        { $inc: { voteCount: 1, freeVotes: 1 } },
        { new: true }
      );

      // Update category vote count
      await Category.findByIdAndUpdate(categoryId, {
        $inc: { totalVotes: 1 },
      });

      // Broadcast the vote update to all connected clients
      sseService.broadcastVoteUpdate(updatedCandidate);

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

// ============ PAID VOTING ============

// POST initialize paid vote payment
router.post(
  '/vote/paid/initialize',
  [
    body('candidateId').notEmpty().withMessage('Candidate ID is required'),
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('voteWeight').isInt({ min: 1, max: 99999 }).withMessage('Vote weight must be between 1 and 99,999'),
    body('email').isEmail().withMessage('Valid email is required'),
      body('amount').isInt({ min: 1 }).withMessage('Amount is required'),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      try {
        const { candidateId, categoryId, voteWeight, email, amount } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Check category is paid voting type
        if (category.pricingType !== 'paid') {
          return res.status(400).json({
            success: false,
            message: 'This category only allows free voting',
          });
        }

        // Create metadata
        const metadata = {
          candidateId,
          categoryId,
          voteWeight,
        };

        // Import Paystack service
        const { initializePayment } = await import('../services/paystackService.js');

        // Build redirect URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/award-payment-callback`;
        
        // Generate reference
        const reference = `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log('[PAYMENT] Initializing payment with:', {
          amount,
          email,
          redirectUrl,
          reference,
          isTestMode: process.env.PAYSTACK_SECRET_KEY?.includes('test'),
        });

        // Initialize payment with the amount sent from frontend
        const paymentResult = await initializePayment(
          amount, // Amount already calculated on frontend (in Naira)
          email,
          reference,
          metadata,
          redirectUrl
        );

        console.log('[PAYMENT] Paystack response:', {
          success: paymentResult.success,
          authUrl: paymentResult.data?.authorization_url?.substring(0, 50),
          reference: reference,
        });

        if (!paymentResult.success) {
          return res.status(400).json({
            success: false,
            message: paymentResult.error || 'Payment initialization failed',
          });
        }

        res.status(200).json({
          success: true,
          message: 'Payment initialized',
          data: {
            authorizationUrl: paymentResult.data.authorization_url,
            accessCode: paymentResult.data.access_code,
            reference: paymentResult.data.reference,
          },
        });
      } catch (error) {
        console.error('Payment initialization error:', error);
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
  }
);

// POST confirm paid vote after payment
router.post(
  '/vote/paid/confirm',
  [
    body('transactionId').notEmpty().withMessage('Transaction ID is required'),
    body('candidateId').notEmpty().withMessage('Candidate ID is required'),
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('voteWeight').isInt({ min: 1, max: 99999 }).withMessage('Vote weight must be between 1 and 99,999'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { transactionId, candidateId, categoryId, voteWeight } = req.body;
      const ipAddress = getClientIP(req);
      const sessionId = req.headers['x-session-id'] || 'anonymous';

      // Import Paystack service
      const { verifyPayment } = await import('../services/paystackService.js');

      // Verify payment with Paystack
      const paymentResult = await verifyPayment(transactionId);

      if (!paymentResult.success || paymentResult.data.status !== 'success') {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
        });
      }

      // Verify candidate and category
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      // Check category is paid voting type
      if (category.pricingType !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'This category only allows free voting',
        });
      }

      // Create vote record with paid multiplier
      const vote = new Vote({
        candidate: candidateId,
        category: categoryId,
        ipAddress,
        sessionId,
        voteType: 'paid',
        voteWeight,
        transactionId,
      });

      await vote.save();

      // Update candidate vote count with weight
      const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        { $inc: { voteCount: voteWeight, paidVotes: voteWeight } },
        { new: true }
      );

      // Update category vote count
      await Category.findByIdAndUpdate(categoryId, {
        $inc: { totalVotes: voteWeight },
      });

      // Broadcast the vote update to all connected clients
      sseService.broadcastVoteUpdate(updatedCandidate);

      res.status(201).json({
        success: true,
        message: 'Paid vote recorded successfully',
        data: {
          voteId: vote._id,
          voteType: 'paid',
          voteWeight,
        },
      });
    } catch (error) {
      console.error('Paid vote confirmation error:', error);
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

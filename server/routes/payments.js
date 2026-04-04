import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import Candidate from '../models/Candidate.js';
import Category from '../models/Category.js';
import Vote from '../models/Vote.js';
import User from '../models/User.js';
import { initializePayment, verifyPayment } from '../services/paystackService.js';
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

const getOptionalUser = async (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id email');
    return user || null;
  } catch {
    return null;
  }
};

// POST /api/payments/initialize - Initialize payment for award votes
router.post(
  '/initialize',
  [
    body('candidateId').notEmpty().withMessage('Candidate ID is required'),
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('voteCount').isInt({ min: 1, max: 100 }).withMessage('Vote count must be between 1 and 100'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { candidateId, categoryId, voteCount, email } = req.body;
      const optionalUser = await getOptionalUser(req);

      // Verify candidate exists
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      // Verify category exists and is paid
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      if (category.pricingType !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'This category does not accept paid votes',
        });
      }

      // Calculate amount in Naira
      const amount = voteCount * (category.pricePerVote || 100);

      // Generate unique reference
      const reference = `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build redirect URL with reference as query parameter
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/award-payment-callback?reference=${reference}`;

      console.log('[PAYMENT INIT]', {
        candidateId,
        categoryId,
        voteCount,
        amount,
        reference,
        redirectUrl,
      });

      // Initialize payment with Paystack
      const paymentResult = await initializePayment(
        amount,
        email,
        reference,
        {
          candidateId,
          categoryId,
          voteCount,
          userId: optionalUser?._id?.toString() || null,
        },
        redirectUrl
      );

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
          reference,
          authorizationUrl: paymentResult.data.authorization_url,
          accessCode: paymentResult.data.access_code,
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

// POST /api/payments/verify - Verify payment and record vote
router.post(
  '/verify',
  [
    body('reference').notEmpty().withMessage('Reference is required'),
    body('candidateId').notEmpty().withMessage('Candidate ID is required'),
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('voteCount').isInt({ min: 1, max: 100 }).withMessage('Vote count must be between 1 and 100'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { reference, candidateId, categoryId, voteCount } = req.body;
      const ipAddress = getClientIP(req);
      const sessionId = req.headers['x-session-id'] || 'anonymous';
      const optionalUser = await getOptionalUser(req);

      console.log('[PAYMENT VERIFY]', {
        reference,
        candidateId,
        categoryId,
        voteCount,
      });

      // Verify payment with Paystack
      const paymentResult = await verifyPayment(reference);

      if (!paymentResult.success || paymentResult.data.status !== 'success') {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          paymentStatus: paymentResult.data?.status,
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

      if (category.pricingType !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'This category does not accept paid votes',
        });
      }

      // Create vote record(s)
      const vote = new Vote({
        candidate: candidateId,
        category: categoryId,
        user: optionalUser?._id,
        ipAddress,
        sessionId,
        voteType: 'paid',
        voteWeight: voteCount,
        transactionId: reference,
      });

      await vote.save();

      // Update candidate vote count and keep updated doc for real-time broadcast
      const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        {
          $inc: { voteCount: voteCount, paidVotes: voteCount },
        },
        { new: true }
      );

      // Update category vote count
      await Category.findByIdAndUpdate(categoryId, {
        $inc: { totalVotes: voteCount },
      });

      // Broadcast the vote update to all connected SSE clients
      if (updatedCandidate) {
        sseService.broadcastVoteUpdate(updatedCandidate);
      }

      console.log('[PAYMENT SUCCESS]', {
        reference,
        candidateId,
        votesRecorded: voteCount,
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified and vote recorded',
        data: {
          reference,
          votesRecorded: voteCount,
          candidate: candidate.name,
        },
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;

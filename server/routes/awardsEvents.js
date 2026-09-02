import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import AwardsEvent from '../models/AwardsEvent.js';
import Category from '../models/Category.js';
import Candidate from '../models/Candidate.js';
import Vote from '../models/Vote.js';
import { protect, admin } from '../middleware/auth.js';
import { requireEventAccess } from '../middleware/awardsAccess.js';
import { generateUniqueSlug } from '../utils/slug.js';
import { resolveEventByIdOrSlug } from '../utils/resolveEvent.js';
import { getFrontendBaseUrl } from '../utils/frontendUrl.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

const toBase64Image = (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

// ============ PUBLIC ============

// @desc    List published awards events
// @route   GET /api/awards-events/public/directory
router.get('/public/directory', async (req, res) => {
  try {
    const events = await AwardsEvent.find({ published: true }).sort({ votingStartsAt: 1 });

    const withCounts = await Promise.all(
      events.map(async (event) => {
        const [categoryCount, candidateCount] = await Promise.all([
          Category.countDocuments({ awardsEvent: event._id }),
          Candidate.countDocuments({
            category: { $in: await Category.find({ awardsEvent: event._id }).distinct('_id') },
          }),
        ]);
        return { ...event.toObject(), categoryCount, candidateCount };
      })
    );

    res.status(200).json({ success: true, data: withCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get a single published awards event by slug (or id)
// @route   GET /api/awards-events/public/:slug
router.get('/public/:slug', async (req, res) => {
  try {
    const event = await resolveEventByIdOrSlug(AwardsEvent, req.params.slug);
    if (!event || !event.published) {
      return res.status(404).json({ success: false, message: 'Awards event not found' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ SUPERADMIN-ONLY ============

// @desc    Create an awards event
// @route   POST /api/awards-events
router.post('/', protect, admin, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, organizerName, organizerEmail, organizerPhone, votingStartsAt, votingEndsAt } = req.body;

    const slug = await generateUniqueSlug(title, AwardsEvent);

    const event = new AwardsEvent({
      title,
      slug,
      description,
      organizerName,
      organizerEmail,
      organizerPhone: organizerPhone || '',
      votingStartsAt,
      votingEndsAt,
      coverImage: req.file ? toBase64Image(req.file) : null,
      createdBy: req.user.id,
    });

    const created = await event.save();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    List all awards events (including drafts)
// @route   GET /api/awards-events
router.get('/', protect, admin, async (req, res) => {
  try {
    const events = await AwardsEvent.find().sort({ createdAt: -1 });

    const withCounts = await Promise.all(
      events.map(async (event) => {
        const categoryIds = await Category.find({ awardsEvent: event._id }).distinct('_id');
        const [categoryCount, candidateCount] = await Promise.all([
          categoryIds.length,
          Candidate.countDocuments({ category: { $in: categoryIds } }),
        ]);
        return { ...event.toObject(), categoryCount, candidateCount };
      })
    );

    res.status(200).json({ success: true, data: withCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete an awards event and cascade its categories/candidates/votes
// @route   DELETE /api/awards-events/:eventId
router.delete('/:eventId', protect, admin, async (req, res) => {
  try {
    const event = await AwardsEvent.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Awards event not found' });
    }

    const categoryIds = await Category.find({ awardsEvent: event._id }).distinct('_id');
    await Candidate.deleteMany({ category: { $in: categoryIds } });
    await Vote.deleteMany({ awardsEvent: event._id });
    await Category.deleteMany({ awardsEvent: event._id });
    await event.deleteOne();

    res.status(200).json({ success: true, message: 'Awards event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Generate or rotate an organizer's secret access link
// @route   POST /api/awards-events/:eventId/organizer-link
router.post('/:eventId/organizer-link', protect, admin, async (req, res) => {
  try {
    const rotate = req.body?.rotate === true;
    const event = await AwardsEvent.findById(req.params.eventId).select('+organizerAccessToken title slug');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Awards event not found' });
    }

    if (!event.organizerAccessToken || rotate) {
      event.organizerAccessToken = crypto.randomBytes(24).toString('hex');
      event.organizerAccessTokenCreatedAt = new Date();
      await event.save();
    }

    const path = `/organizer/${event.slug || event._id}?access=${encodeURIComponent(event.organizerAccessToken)}`;
    const url = `${getFrontendBaseUrl()}${path}`;

    res.status(200).json({
      success: true,
      eventId: event._id,
      eventTitle: event.title,
      path,
      url,
      tokenCreatedAt: event.organizerAccessTokenCreatedAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ SUPERADMIN OR ORGANIZER (scoped to one event) ============

// @desc    Get one event's full details
// @route   GET /api/awards-events/:eventId
router.get('/:eventId', requireEventAccess, async (req, res) => {
  res.status(200).json({ success: true, data: req.awardsEvent, isSuperadmin: req.isSuperadmin });
});

// @desc    Update an event's settings
// @route   PUT /api/awards-events/:eventId
router.put('/:eventId', requireEventAccess, upload.single('coverImage'), async (req, res) => {
  try {
    const event = req.awardsEvent;
    const updatable = ['title', 'description', 'organizerName', 'organizerEmail', 'organizerPhone', 'votingStartsAt', 'votingEndsAt'];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    // Organizers cannot toggle publication themselves - that's a superadmin sign-off
    if (req.isSuperadmin && req.body.published !== undefined) {
      event.published = req.body.published === 'true' || req.body.published === true;
    }

    if (req.file) {
      event.coverImage = toBase64Image(req.file);
    }

    const updated = await event.save();
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    List categories for this event
// @route   GET /api/awards-events/:eventId/categories
router.get('/:eventId/categories', requireEventAccess, async (req, res) => {
  try {
    const categories = await Category.find({ awardsEvent: req.awardsEvent._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a category for this event
// @route   POST /api/awards-events/:eventId/categories
router.post('/:eventId/categories', requireEventAccess, async (req, res) => {
  try {
    const { name, description, status, pricingType, pricePerVote } = req.body;

    const category = new Category({
      name,
      description,
      status: status || 'active',
      pricingType: pricingType || 'free',
      pricePerVote,
      awardsEvent: req.awardsEvent._id,
    });

    const created = await category.save();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update a category (must belong to this event)
// @route   PUT /api/awards-events/:eventId/categories/:categoryId
router.put('/:eventId/categories/:categoryId', requireEventAccess, async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category || category.awardsEvent.toString() !== req.awardsEvent._id.toString()) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    delete req.body.awardsEvent;
    Object.assign(category, req.body);
    const updated = await category.save();
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a category (must belong to this event)
// @route   DELETE /api/awards-events/:eventId/categories/:categoryId
router.delete('/:eventId/categories/:categoryId', requireEventAccess, async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category || category.awardsEvent.toString() !== req.awardsEvent._id.toString()) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await Candidate.deleteMany({ category: category._id });
    await Vote.deleteMany({ category: category._id });
    await category.deleteOne();

    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    List candidates for this event (optionally filtered by category)
// @route   GET /api/awards-events/:eventId/candidates
router.get('/:eventId/candidates', requireEventAccess, async (req, res) => {
  try {
    const categoryIds = req.query.categoryId
      ? [req.query.categoryId]
      : await Category.find({ awardsEvent: req.awardsEvent._id }).distinct('_id');

    const candidates = await Candidate.find({ category: { $in: categoryIds } }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a candidate under one of this event's categories
// @route   POST /api/awards-events/:eventId/candidates
router.post('/:eventId/candidates', requireEventAccess, upload.single('image'), async (req, res) => {
  try {
    const category = await Category.findById(req.body.category);
    if (!category || category.awardsEvent.toString() !== req.awardsEvent._id.toString()) {
      return res.status(404).json({ success: false, message: 'Category not found for this event' });
    }

    const candidate = new Candidate({
      name: req.body.name,
      description: req.body.description || '',
      category: category._id,
      image: req.file ? toBase64Image(req.file) : (req.body.image || null),
    });

    const created = await candidate.save();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update a candidate (must belong to this event)
// @route   PUT /api/awards-events/:eventId/candidates/:candidateId
router.put('/:eventId/candidates/:candidateId', requireEventAccess, upload.single('image'), async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId).populate('category', 'awardsEvent');
    if (!candidate || candidate.category.awardsEvent.toString() !== req.awardsEvent._id.toString()) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (req.body.name !== undefined) candidate.name = req.body.name;
    if (req.body.description !== undefined) candidate.description = req.body.description;
    if (req.file) candidate.image = toBase64Image(req.file);

    const updated = await candidate.save();
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a candidate (must belong to this event)
// @route   DELETE /api/awards-events/:eventId/candidates/:candidateId
router.delete('/:eventId/candidates/:candidateId', requireEventAccess, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId).populate('category', 'awardsEvent');
    if (!candidate || candidate.category.awardsEvent.toString() !== req.awardsEvent._id.toString()) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    await Vote.deleteMany({ candidate: candidate._id });
    await candidate.deleteOne();

    res.status(200).json({ success: true, message: 'Candidate deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Voting activity summary + recent votes feed for this event
// @route   GET /api/awards-events/:eventId/activity
router.get('/:eventId/activity', requireEventAccess, async (req, res) => {
  try {
    const eventId = req.awardsEvent._id;

    const totalsAgg = await Vote.aggregate([
      { $match: { awardsEvent: eventId } },
      { $group: { _id: '$voteType', totalWeight: { $sum: '$voteWeight' } } },
    ]);

    const revenueAgg = await Vote.aggregate([
      { $match: { awardsEvent: eventId, voteType: 'paid' } },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: '$cat' },
      { $group: { _id: null, revenue: { $sum: { $multiply: ['$voteWeight', '$cat.pricePerVote'] } } } },
    ]);

    const freeVotes = totalsAgg.find((t) => t._id === 'free')?.totalWeight || 0;
    const paidVotes = totalsAgg.find((t) => t._id === 'paid')?.totalWeight || 0;
    const revenue = revenueAgg[0]?.revenue || 0;

    const recentVotes = await Vote.find({ awardsEvent: eventId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('candidate', 'name')
      .populate('category', 'name pricingType');

    res.status(200).json({
      success: true,
      data: {
        totals: {
          totalVotes: freeVotes + paidVotes,
          freeVotes,
          paidVotes,
          revenue,
        },
        recentVotes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

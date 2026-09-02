import express from 'express';
import Category from '../models/Category.js';
import Candidate from '../models/Candidate.js';

const router = express.Router();

// ============ CATEGORY ROUTES (public reads only) ============
// Mutating routes have moved to /api/awards-events/:eventId/categories,
// which are properly scoped to one event and require superadmin or organizer access.

// GET all categories, optionally scoped to one awards event
router.get('/categories', async (req, res) => {
  try {
    const query = req.query.awardsEvent ? { awardsEvent: req.query.awardsEvent } : {};
    const categories = await Category.find(query).populate('createdBy', 'name email');
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET single category with candidates
router.get('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('createdBy', 'name email');
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const candidates = await Candidate.find({ category: req.params.id });

    res.status(200).json({
      success: true,
      data: {
        ...category._doc,
        candidates,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============ CANDIDATE ROUTES (public reads only) ============

// GET all candidates for an awards event, across every category - powers
// event-wide search (find a candidate no matter which category they're in)
router.get('/candidates', async (req, res) => {
  try {
    if (!req.query.awardsEvent) {
      return res.status(400).json({ success: false, message: 'awardsEvent query parameter is required' });
    }
    const categoryIds = await Category.find({ awardsEvent: req.query.awardsEvent }).distinct('_id');
    const candidates = await Candidate.find({ category: { $in: categoryIds } }).populate('category', 'name');
    res.status(200).json({
      success: true,
      data: candidates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET candidates by category
router.get('/candidates/category/:categoryId', async (req, res) => {
  try {
    const candidates = await Candidate.find({ category: req.params.categoryId }).sort('-voteCount');
    res.status(200).json({
      success: true,
      data: candidates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET single candidate
router.get('/candidates/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('category');
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }
    res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;

import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect as authMiddleware } from '../middleware/auth.js';
import Category from '../models/Category.js';
import Candidate from '../models/Candidate.js';
import Vote from '../models/Vote.js';

const router = express.Router();

// ============ CATEGORY ROUTES ============

// GET all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().populate('createdBy', 'name email');
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

// CREATE category (Admin only)
router.post(
  '/categories',
  authMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('status').isIn(['upcoming', 'active', 'ended', 'paused']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const category = new Category({
        ...req.body,
        createdBy: req.user.id,
      });

      const savedCategory = await category.save();
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: savedCategory,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// UPDATE category (Admin only)
router.put('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE category (Admin only)
router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Also delete related candidates and votes
    await Candidate.deleteMany({ category: req.params.id });
    await Vote.deleteMany({ category: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============ CANDIDATE ROUTES ============

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

// CREATE candidate (Admin only)
router.post(
  '/candidates',
  authMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Candidate name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      // Verify category exists
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      const candidate = new Candidate(req.body);
      const savedCandidate = await candidate.save();

      res.status(201).json({
        success: true,
        message: 'Candidate created successfully',
        data: savedCandidate,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// UPDATE candidate (Admin only)
router.put('/candidates/:id', authMiddleware, async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      data: candidate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE candidate (Admin only)
router.delete('/candidates/:id', authMiddleware, async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    // Delete related votes
    await Vote.deleteMany({ candidate: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;

import express from 'express';
import { body, validationResult } from 'express-validator';
import Comment from '../models/Comment.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get comments for content
// @route   GET /api/comments
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { contentType, contentId } = req.query;

    let query = { approved: true };

    if (contentType && contentId) {
      query.contentType = contentType;
      query.contentId = contentId;
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .populate('replies');

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single comment
// @route   GET /api/comments/:id
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (comment) {
      res.json(comment);
    } else {
      res.status(404).json({ message: 'Comment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a comment
// @route   POST /api/comments
// @access  Public
router.post('/', [
  body('content').trim().isLength({ min: 1 }),
  body('author').trim().isLength({ min: 1 }),
  body('email').isEmail(),
  body('contentType').isIn(['blog', 'event', 'job']),
  body('contentId').isMongoId(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const comment = new Comment(req.body);
    const createdComment = await comment.save();
    res.status(201).json(createdComment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update a comment (approve/reject)
// @route   PUT /api/comments/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (comment) {
      Object.assign(comment, req.body);
      const updatedComment = await comment.save();
      res.json(updatedComment);
    } else {
      res.status(404).json({ message: 'Comment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (comment) {
      // Also delete replies
      await Comment.deleteMany({ parentComment: req.params.id });
      await comment.deleteOne();
      res.json({ message: 'Comment removed' });
    } else {
      res.status(404).json({ message: 'Comment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all comments (admin)
// @route   GET /api/comments/admin/all
// @access  Private/Admin
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const pageSize = 20;
    const page = Number(req.query.pageNumber) || 1;

    const count = await Comment.countDocuments();
    const comments = await Comment.find({})
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .populate('replies');

    res.json({
      comments,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Approve multiple comments
// @route   PUT /api/comments/approve/bulk
// @access  Private/Admin
router.put('/approve/bulk', protect, admin, async (req, res) => {
  try {
    const { commentIds } = req.body;

    await Comment.updateMany(
      { _id: { $in: commentIds } },
      { approved: true }
    );

    res.json({ message: 'Comments approved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
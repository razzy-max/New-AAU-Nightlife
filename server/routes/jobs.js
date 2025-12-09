import express from 'express';
import { body, validationResult } from 'express-validator';
import Job from '../models/Job.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;
    const type = req.query.type || '';
    const search = req.query.search || '';
    const admin = req.query.admin === 'true'; // Check if admin request

    let query = admin ? {} : { published: true }; // Show all for admin, published only for public

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const count = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      jobs,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (job) {
      res.json(job);
    } else {
      res.status(404).json({ message: 'Job not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a job
// @route   POST /api/jobs
// @access  Private/Admin
router.post('/', protect, admin, [
  body('title').trim().isLength({ min: 1 }),
  body('company').trim().isLength({ min: 1 }),
  body('location').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('requirements').trim().isLength({ min: 1 }),
  body('salary').trim().isLength({ min: 1 }),
  body('type').isIn(['Full-time', 'Part-time', 'Contract', 'Internship']),
  body('contactEmail').isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const job = new Job(req.body);
    const createdJob = await job.save();
    res.status(201).json(createdJob);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update a job
// @route   PUT /api/jobs/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (job) {
      Object.assign(job, req.body);
      const updatedJob = await job.save();
      res.json(updatedJob);
    } else {
      res.status(404).json({ message: 'Job not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (job) {
      await job.deleteOne();
      res.json({ message: 'Job removed' });
    } else {
      res.status(404).json({ message: 'Job not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get featured jobs
// @route   GET /api/jobs/featured/list
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const jobs = await Job.find({ featured: true, published: true })
      .sort({ createdAt: -1 })
      .limit(3);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
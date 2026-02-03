import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import Event from '../models/Event.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// @desc    Get all events
// @route   GET /api/events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;
    const category = req.query.category || '';
    const search = req.query.search || '';
    const admin = req.query.admin === 'true'; // Check if admin request

    let query = admin ? {} : { published: true }; // Show all for admin, published only for public

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const count = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ date: 1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      events,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create an event
// @route   POST /api/events
// @access  Private/Admin
router.post('/', protect, admin, upload.single('image'), [
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('shortDescription').trim().isLength({ min: 1 }),
  body('date').isDate(),
  body('time').trim().isLength({ min: 1 }),
  body('location').trim().isLength({ min: 1 }),
  body('contactEmail').isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Convert uploaded file to base64 data URL (like blogs)
    let imageData = req.body.image; // Default to provided image URL

    if (req.file) {
      const imageBuffer = req.file.buffer;
      const imageMimeType = req.file.mimetype;
      imageData = `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`;
    }

    // Parse tickets if provided
    let tickets = [];
    if (req.body.tickets) {
      try {
        tickets = typeof req.body.tickets === 'string' ? JSON.parse(req.body.tickets) : req.body.tickets;
      } catch (e) {
        tickets = [];
      }
    }

    const eventData = {
      ...req.body,
      image: imageData,
      featured: req.body.featured === 'true' || req.body.featured === true,
      published: req.body.published === 'true' || req.body.published === true,
      hasTicketing: tickets.length > 0,
      tickets: tickets,
    };

    // Remove old price field if exists
    delete eventData.price;

    const event = new Event(eventData);
    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (event) {
      // Parse tickets if provided
      if (req.body.tickets) {
        try {
          const tickets = typeof req.body.tickets === 'string' ? JSON.parse(req.body.tickets) : req.body.tickets;
          req.body.tickets = tickets;
          req.body.hasTicketing = tickets.length > 0;
        } catch (e) {
          req.body.tickets = [];
          req.body.hasTicketing = false;
        }
      }

      // Handle image upload - convert to base64 if new file uploaded
      if (req.file) {
        const imageBuffer = req.file.buffer;
        const imageMimeType = req.file.mimetype;
        req.body.image = `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`;
      }

      // Remove old price field if exists
      delete req.body.price;

      Object.assign(event, req.body);
      const updatedEvent = await event.save();
      res.json(updatedEvent);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (event) {
      await event.deleteOne();
      res.json({ message: 'Event removed' });
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get featured events
// @route   GET /api/events/featured/list
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const events = await Event.find({ featured: true, published: true })
      .sort({ date: 1 })
      .limit(3);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get upcoming events
// @route   GET /api/events/upcoming/list
// @access  Public
router.get('/upcoming/list', async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      published: true,
      date: { $gte: now }
    })
      .sort({ date: 1 })
      .limit(3);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get featured events
// @route   GET /api/events/featured/list
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const events = await Event.find({ featured: true, published: true })
      .sort({ createdAt: -1 })
      .limit(3);

    // Cache featured events for 10 minutes
    res.set({
      'Cache-Control': 'public, max-age=600, s-maxage=300',
      'ETag': `"featured-events-${events.length}-${events[0]?.updatedAt || 'none'}"`,
      'Vary': 'Accept-Encoding'
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
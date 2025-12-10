import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import Carousel from '../models/Carousel.js';
import { protect, admin } from '../middleware/auth.js';

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

const router = express.Router();

// @desc    Get all carousel slides
// @route   GET /api/carousel
// @access  Public
router.get('/', async (req, res) => {
  try {
    const admin = req.query.admin === 'true';
    const slides = await Carousel.find(admin ? {} : { active: true })
      .sort({ order: 1 });
    res.json(slides);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single carousel slide
// @route   GET /api/carousel/:id
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const slide = await Carousel.findById(req.params.id);

    if (slide) {
      res.json(slide);
    } else {
      res.status(404).json({ message: 'Slide not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a carousel slide
// @route   POST /api/carousel
// @access  Private/Admin
router.post('/', protect, admin, upload.single('image'), [
  body('title').trim().isLength({ min: 1 }),
  body('altText').trim().isLength({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Convert uploaded file to base64 data URL
    let imageData = req.body.image; // Default to provided image URL

    if (req.file) {
      const imageBuffer = req.file.buffer;
      const imageMimeType = req.file.mimetype;
      imageData = `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`;
    }

    const slideData = {
      ...req.body,
      image: imageData,
      order: req.body.order ? parseInt(req.body.order) : 0,
      active: req.body.active === 'true' || req.body.active === true
    };

    const slide = new Carousel(slideData);
    const createdSlide = await slide.save();
    res.status(201).json(createdSlide);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update a carousel slide
// @route   PUT /api/carousel/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const slide = await Carousel.findById(req.params.id);

    if (slide) {
      // Handle image upload
      let imageData = req.body.image || slide.image; // Keep existing if no new image

      if (req.file) {
        const imageBuffer = req.file.buffer;
        const imageMimeType = req.file.mimetype;
        imageData = `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`;
      }

      const updateData = {
        ...req.body,
        image: imageData,
        order: req.body.order ? parseInt(req.body.order) : slide.order,
        active: req.body.active === 'true' || req.body.active === true
      };

      Object.assign(slide, updateData);
      const updatedSlide = await slide.save();
      res.json(updatedSlide);
    } else {
      res.status(404).json({ message: 'Slide not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete a carousel slide
// @route   DELETE /api/carousel/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const slide = await Carousel.findById(req.params.id);

    if (slide) {
      await slide.deleteOne();
      res.json({ message: 'Slide removed' });
    } else {
      res.status(404).json({ message: 'Slide not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update slide order
// @route   PUT /api/carousel/order/update
// @access  Private/Admin
router.put('/order/update', protect, admin, async (req, res) => {
  try {
    const { slides } = req.body; // Array of {id, order}

    for (const slideData of slides) {
      await Carousel.findByIdAndUpdate(slideData.id, { order: slideData.order });
    }

    res.json({ message: 'Order updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
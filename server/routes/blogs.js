import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Blog from '../models/Blog.js';
import { protect, admin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads (memory storage for MongoDB)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for image field'));
      }
    } else if (file.fieldname === 'video') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for video field'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// @desc    Get all blogs
// @route   GET /api/blogs
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

    const count = await Blog.countDocuments(query);
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .select('-video'); // Exclude video field for list view to reduce payload

    // Add cache headers for better performance (only for public requests)
    if (!admin) {
      res.set({
        'Cache-Control': 'public, max-age=600, s-maxage=300', // 10 min browser, 5 min CDN
        'ETag': `"blogs-${page}-${category}-${search}-${count}"`,
        'Vary': 'Accept-Encoding'
      });
    }

    res.json({
      blogs,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (blog) {
      // Cache individual blog posts for 15 minutes
      res.set({
        'Cache-Control': 'public, max-age=900, s-maxage=600',
        'ETag': `"blog-${blog._id}-${blog.updatedAt}"`,
        'Vary': 'Accept-Encoding'
      });
      res.json(blog);
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private/Admin
router.post('/', protect, admin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), [
  body('title').trim().isLength({ min: 1 }),
  body('excerpt').trim().isLength({ min: 1 }),
  body('content').trim().isLength({ min: 1 }),
  body('author').trim().isLength({ min: 1 }),
  body('category').isIn(['General', 'Events', 'Jobs', 'Sports', 'Academics']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Convert uploaded files to base64 data URLs
    let imageData = req.body.image; // Default to provided image URL
    let videoData = null;

    if (req.files.image && req.files.image[0]) {
      const imageBuffer = req.files.image[0].buffer;
      const imageMimeType = req.files.image[0].mimetype;
      imageData = `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`;
    }

    if (req.files.video && req.files.video[0]) {
      const videoBuffer = req.files.video[0].buffer;
      const videoMimeType = req.files.video[0].mimetype;
      videoData = `data:${videoMimeType};base64,${videoBuffer.toString('base64')}`;
    }

    const blogData = {
      ...req.body,
      image: imageData,
      video: videoData,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
    };

    const blog = new Blog(blogData);
    const createdBlog = await blog.save();
    res.status(201).json(createdBlog);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (blog) {
      console.log(`Updating blog ${req.params.id}:`, req.body);
      Object.assign(blog, req.body);
      const updatedBlog = await blog.save();
      console.log(`Blog ${req.params.id} updated successfully. Featured: ${updatedBlog.featured}`);

      // Set cache control headers to prevent caching of this response
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(updatedBlog);
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (blog) {
      await blog.deleteOne();
      res.json({ message: 'Blog removed' });
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get featured blogs
// @route   GET /api/blogs/featured/list
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const blogs = await Blog.find({ featured: true, published: true })
      .sort({ createdAt: -1 })
      .limit(3);

    // Cache featured blogs for 10 minutes
    res.set({
      'Cache-Control': 'public, max-age=600, s-maxage=300',
      'ETag': `"featured-blogs-${blogs.length}-${blogs[0]?.updatedAt || 'none'}"`,
      'Vary': 'Accept-Encoding'
    });

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Invalidate cache (Admin only)
// @route   POST /api/blogs/invalidate-cache
// @access  Private/Admin
router.post('/invalidate-cache', protect, admin, async (req, res) => {
  try {
    // This endpoint can be used to invalidate CDN caches or trigger cache refresh
    // For now, we'll just return success and let the admin know cache should refresh
    console.log('Cache invalidation requested by admin');

    res.json({
      message: 'Cache invalidation triggered',
      note: 'Public caches will refresh on next request (may take up to 10 minutes)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
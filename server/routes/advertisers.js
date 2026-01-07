import express from 'express';
import multer from 'multer';
import Advertiser from '../models/Advertiser.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads (same as blogs/events)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit for logos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Public route - Get all active featured advertisers
router.get('/featured', async (req, res) => {
  try {
    const advertisers = await Advertiser.find({ 
      active: true, 
      featured: true 
    }).sort({ displayOrder: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: advertisers
    });
  } catch (error) {
    console.error('Error fetching featured advertisers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin route - Get all advertisers
router.get('/admin/all', protect, async (req, res) => {
  try {
    const advertisers = await Advertiser.find().sort({ displayOrder: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: advertisers
    });
  } catch (error) {
    console.error('Error fetching advertisers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin route - Create new advertiser
router.post('/admin/create', protect, upload.single('logo'), async (req, res) => {
  try {
    const { companyName, website, whatsapp, instagram, facebook, description, featured, active, displayOrder } = req.body;

    // Convert uploaded file to base64 (same as blogs/events)
    let logoData = null;
    if (req.file) {
      const logoBuffer = req.file.buffer;
      const logoMimeType = req.file.mimetype;
      logoData = `data:${logoMimeType};base64,${logoBuffer.toString('base64')}`;
    }

    if (!companyName || !logoData) {
      return res.status(400).json({
        success: false,
        message: 'Company name and logo are required'
      });
    }

    const advertiser = new Advertiser({
      companyName,
      logo: logoData,
      website,
      whatsapp,
      instagram,
      facebook,
      description,
      featured: featured === 'true' || featured === true,
      active: active === 'true' || active === true,
      displayOrder: parseInt(displayOrder) || 0
    });

    await advertiser.save();

    res.status(201).json({
      success: true,
      data: advertiser,
      message: 'Advertiser created successfully'
    });
  } catch (error) {
    console.error('Error creating advertiser:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// Admin route - Update advertiser
router.put('/admin/update/:id', protect, upload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, website, whatsapp, instagram, facebook, description, featured, active, displayOrder } = req.body;

    const advertiser = await Advertiser.findById(id);
    if (!advertiser) {
      return res.status(404).json({
        success: false,
        message: 'Advertiser not found'
      });
    }

    // Convert uploaded file to base64 if new logo provided
    if (req.file) {
      const logoBuffer = req.file.buffer;
      const logoMimeType = req.file.mimetype;
      advertiser.logo = `data:${logoMimeType};base64,${logoBuffer.toString('base64')}`;
    }

    if (companyName) advertiser.companyName = companyName;
    if (website !== undefined) advertiser.website = website;
    if (whatsapp !== undefined) advertiser.whatsapp = whatsapp;
    if (instagram !== undefined) advertiser.instagram = instagram;
    if (facebook !== undefined) advertiser.facebook = facebook;
    if (description !== undefined) advertiser.description = description;
    if (featured !== undefined) advertiser.featured = featured === 'true' || featured === true;
    if (active !== undefined) advertiser.active = active === 'true' || active === true;
    if (displayOrder !== undefined) advertiser.displayOrder = parseInt(displayOrder) || 0;

    await advertiser.save();

    res.status(200).json({
      success: true,
      data: advertiser,
      message: 'Advertiser updated successfully'
    });
  } catch (error) {
    console.error('Error updating advertiser:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin route - Delete advertiser
router.delete('/admin/delete/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const advertiser = await Advertiser.findByIdAndDelete(id);
    if (!advertiser) {
      return res.status(404).json({
        success: false,
        message: 'Advertiser not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Advertiser deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting advertiser:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;

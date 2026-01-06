import express from 'express';
import Advertiser from '../models/Advertiser.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

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
router.post('/admin/create', protect, async (req, res) => {
  try {
    const { companyName, logo, website, whatsapp, instagram, facebook, description, featured, active, displayOrder } = req.body;

    if (!companyName || !logo) {
      return res.status(400).json({
        success: false,
        message: 'Company name and logo are required'
      });
    }

    const advertiser = new Advertiser({
      companyName,
      logo,
      website,
      whatsapp,
      instagram,
      facebook,
      description,
      featured: featured !== undefined ? featured : false,
      active: active !== undefined ? active : true,
      displayOrder: displayOrder || 0
    });

    await advertiser.save();

    res.status(201).json({
      success: true,
      data: advertiser,
      message: 'Advertiser created successfully'
    });
  } catch (error) {
    console.error('Error creating advertiser:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin route - Update advertiser
router.put('/admin/update/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, logo, website, whatsapp, instagram, facebook, description, featured, active, displayOrder } = req.body;

    const advertiser = await Advertiser.findById(id);
    if (!advertiser) {
      return res.status(404).json({
        success: false,
        message: 'Advertiser not found'
      });
    }

    if (companyName) advertiser.companyName = companyName;
    if (logo) advertiser.logo = logo;
    if (website !== undefined) advertiser.website = website;
    if (whatsapp !== undefined) advertiser.whatsapp = whatsapp;
    if (instagram !== undefined) advertiser.instagram = instagram;
    if (facebook !== undefined) advertiser.facebook = facebook;
    if (description !== undefined) advertiser.description = description;
    if (featured !== undefined) advertiser.featured = featured;
    if (active !== undefined) advertiser.active = active;
    if (displayOrder !== undefined) advertiser.displayOrder = displayOrder;

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

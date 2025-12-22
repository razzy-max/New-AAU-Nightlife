import express from 'express';
import Subscriber from '../models/Subscriber.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public route - Subscribe to newsletter
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if already subscribed
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return res.status(400).json({ message: 'This email is already subscribed to our newsletter' });
      } else {
        // Reactivate unsubscribed user
        existingSubscriber.status = 'active';
        existingSubscriber.subscribedAt = Date.now();
        await existingSubscriber.save();
        return res.status(200).json({ message: 'Welcome back! Your subscription has been reactivated.' });
      }
    }

    // Create new subscriber
    const subscriber = new Subscriber({ email });
    await subscriber.save();

    res.status(201).json({ message: 'Successfully subscribed to our newsletter!' });
  } catch (error) {
    console.error('Error subscribing:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Admin route - Get all subscribers
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const query = status ? { status } : {};
    
    const subscribers = await Subscriber.find(query)
      .sort({ subscribedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Subscriber.countDocuments(query);

    res.json({
      subscribers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin route - Get subscribers count
router.get('/admin/count', authenticateToken, async (req, res) => {
  try {
    const activeCount = await Subscriber.countDocuments({ status: 'active' });
    const unsubscribedCount = await Subscriber.countDocuments({ status: 'unsubscribed' });
    
    res.json({
      active: activeCount,
      unsubscribed: unsubscribedCount,
      total: activeCount + unsubscribedCount
    });
  } catch (error) {
    console.error('Error fetching subscriber count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin route - Delete subscriber
router.delete('/admin/:id', authenticateToken, async (req, res) => {
  try {
    const subscriber = await Subscriber.findByIdAndDelete(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin route - Export subscribers to CSV
router.get('/admin/export', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    
    const subscribers = await Subscriber.find(query).sort({ subscribedAt: -1 });

    // Create CSV content
    let csv = 'Email,Status,Subscribed Date\n';
    subscribers.forEach(sub => {
      const date = new Date(sub.subscribedAt).toLocaleDateString();
      csv += `${sub.email},${sub.status},${date}\n`;
    });

    // Set headers for file download
    const filename = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting subscribers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

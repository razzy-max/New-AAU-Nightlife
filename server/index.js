import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import User from './models/User.js';
import Blog from './models/Blog.js';
import Event from './models/Event.js';
import Job from './models/Job.js';
import Carousel from './models/Carousel.js';
import Comment from './models/Comment.js';
import Ticket from './models/Ticket.js';
import Order from './models/Order.js';
import Subscriber from './models/Subscriber.js';
import Advertiser from './models/Advertiser.js';

// Import routes (we'll create these next)
import authRoutes from './routes/auth.js';
import blogRoutes from './routes/blogs.js';
import eventRoutes from './routes/events.js';
import jobRoutes from './routes/jobs.js';
import carouselRoutes from './routes/carousel.js';
import commentRoutes from './routes/comments.js';
import ticketRoutes from './routes/tickets.js';
import orderRoutes from './routes/orders.js';
import subscriberRoutes from './routes/subscribers.js';
import awardRoutes from './routes/awards.js';
import awardsEventRoutes from './routes/awardsEvents.js';
import votingRoutes from './routes/voting.js';
import paymentRoutes from './routes/payments.js';
import advertiserRoutes from './routes/advertisers.js';
import userRoutes from './routes/users.js';

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created');
}

connectDB();

const ensureTicketIndexes = async () => {
  try {
    const collection = mongoose.connection.db.collection('tickets');
    const indexes = await collection.indexes();
    const paymentRefIndex = indexes.find((index) => index.name === 'paymentReference_1');

    if (paymentRefIndex?.unique) {
      await collection.dropIndex('paymentReference_1');
      await collection.createIndex({ paymentReference: 1 }, { sparse: true });
      console.log('[DB] Migrated ticket paymentReference index to non-unique sparse');
    }
  } catch (error) {
    console.error('[DB] Index migration warning:', error.message);
  }
};

mongoose.connection.once('open', () => {
  ensureTicketIndexes();
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads (we'll create uploads directory)
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log('Static serving uploads from:', uploadsPath);
console.log('Uploads directory exists:', fs.existsSync(uploadsPath));
app.use('/uploads', express.static(uploadsPath));

// Test endpoint for uploads
app.get('/test-uploads', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, '../uploads');
  const exists = fs.existsSync(uploadsPath);
  const files = exists ? fs.readdirSync(uploadsPath) : [];
  res.json({ uploadsPath, exists, files });
});

// Serve static files from public directory
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/awards', awardRoutes);
app.use('/api/awards-events', awardsEventRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/advertisers', advertiserRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
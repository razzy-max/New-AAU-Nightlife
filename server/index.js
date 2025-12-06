import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Import routes (we'll create these next)
import authRoutes from './routes/auth.js';
import blogRoutes from './routes/blogs.js';
import eventRoutes from './routes/events.js';
import jobRoutes from './routes/jobs.js';
import carouselRoutes from './routes/carousel.js';
import commentRoutes from './routes/comments.js';

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created');
}

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads (we'll create uploads directory)
const uploadsPath = path.join(__dirname, '../uploads');
console.log('Uploads path:', uploadsPath);
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
app.use('/api/jobs', jobRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/comments', commentRoutes);

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
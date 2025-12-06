import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  excerpt: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['General', 'Events', 'Jobs', 'Sports', 'Academics'],
  },
  image: {
    type: String, // Path to uploaded image file
    required: true,
  },
  video: {
    type: String, // Path to uploaded video file (optional)
    default: null,
  },
  tags: [{
    type: String,
  }],
  published: {
    type: Boolean,
    default: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for search
blogSchema.index({ title: 'text', excerpt: 'text', content: 'text' });

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
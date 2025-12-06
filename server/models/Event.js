import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  image: {
    type: String, // URL to image
    required: true,
  },
  capacity: {
    type: Number,
    default: null,
  },
  price: {
    type: Number,
    default: 0, // 0 for free events
  },
  category: {
    type: String,
    enum: ['Social', 'Academic', 'Sports', 'Cultural', 'Other'],
    default: 'Other',
  },
  organizer: {
    type: String,
    required: true,
  },
  contactEmail: {
    type: String,
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  published: {
    type: Boolean,
    default: true,
  },
  tags: [{
    type: String,
  }],
}, {
  timestamps: true,
});

// Index for search
eventSchema.index({ title: 'text', description: 'text' });

const Event = mongoose.model('Event', eventSchema);

export default Event;
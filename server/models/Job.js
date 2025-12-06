import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  requirements: {
    type: String,
    required: true,
  },
  salary: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    required: true,
  },
  category: {
    type: String,
    enum: ['Hospitality', 'Event Management', 'Marketing', 'Operations', 'Other'],
    default: 'Other',
  },
  applicationDeadline: {
    type: Date,
    default: null,
  },
  contactEmail: {
    type: String,
    required: true,
  },
  image: {
    type: String, // URL to company logo or job image
    default: null,
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
jobSchema.index({ title: 'text', description: 'text', company: 'text' });

const Job = mongoose.model('Job', jobSchema);

export default Job;
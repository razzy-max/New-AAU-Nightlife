import mongoose from 'mongoose';

const carouselSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String, // URL to image
    required: true,
  },
  altText: {
    type: String,
    required: true,
  },
  link: {
    type: String, // Optional link when clicked
    default: null,
  },
  order: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Ensure order is unique and indexed
carouselSchema.index({ order: 1 });

const Carousel = mongoose.model('Carousel', carouselSchema);

export default Carousel;
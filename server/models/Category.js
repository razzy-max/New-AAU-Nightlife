import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
    },
    pricingType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
      required: [true, 'Please specify if category is free or paid'],
    },
    pricePerVote: {
      type: Number,
      default: 100, // Default price in Naira (₦100 per vote)
      // Only applicable if pricingType is 'paid'
      validate: {
        validator: function(value) {
          // Only validate if this is a paid category
          return this.pricingType === 'free' || value > 0;
        },
        message: 'Price per vote must be greater than 0 for paid categories',
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide an end date'],
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'ended', 'paused'],
      default: 'upcoming',
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    awardsEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AwardsEvent',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

categorySchema.index({ awardsEvent: 1, status: 1 });

export default mongoose.model('Category', categorySchema);

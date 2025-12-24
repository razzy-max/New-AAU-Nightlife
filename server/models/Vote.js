import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // For anonymous votes
    },
    ipAddress: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    voteType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    voteWeight: {
      type: Number,
      default: 1, // Multiplier for paid votes
    },
    transactionId: {
      type: String,
      default: null, // For paid votes via Paystack
    },
    captchaToken: {
      type: String,
      default: null, // For free votes
    },
    isValid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index to prevent duplicate votes from same IP + session within timeframe
voteSchema.index({ ipAddress: 1, sessionId: 1, createdAt: 1 });
voteSchema.index({ candidate: 1, category: 1 });

export default mongoose.model('Vote', voteSchema);

import mongoose from 'mongoose';

const votingAnalyticsSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    hour: {
      type: Number,
      min: 0,
      max: 23,
    },
    freeVotesCount: {
      type: Number,
      default: 0,
    },
    paidVotesCount: {
      type: Number,
      default: 0,
    },
    totalVotesCount: {
      type: Number,
      default: 0,
    },
    uniqueVoters: {
      type: Number,
      default: 0,
    },
    candidateBreakdown: [
      {
        candidate: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Candidate',
        },
        voteCount: Number,
        percentage: Number,
      },
    ],
    peakHour: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for quick lookups
votingAnalyticsSchema.index({ category: 1, date: 1 });
votingAnalyticsSchema.index({ category: 1, hour: 1 });

export default mongoose.model('VotingAnalytics', votingAnalyticsSchema);

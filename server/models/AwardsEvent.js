import mongoose from 'mongoose';

const awardsEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    description: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String, // Base64 data URL or URL to image
      default: null,
    },
    organizerName: {
      type: String,
      required: true,
      trim: true,
    },
    organizerEmail: {
      type: String,
      required: true,
      trim: true,
    },
    organizerPhone: {
      type: String,
      default: '',
    },
    votingStartsAt: {
      type: Date,
      required: true,
    },
    votingEndsAt: {
      type: Date,
      required: true,
    },
    published: {
      type: Boolean,
      default: false,
    },
    organizerAccessToken: {
      type: String,
      default: null,
      select: false,
    },
    organizerAccessTokenCreatedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

awardsEventSchema.index({ title: 'text', description: 'text' });

awardsEventSchema.pre('validate', function (next) {
  if (this.votingStartsAt && this.votingEndsAt && this.votingEndsAt <= this.votingStartsAt) {
    return next(new Error('Voting end time must be after the start time'));
  }
  next();
});

export default mongoose.model('AwardsEvent', awardsEventSchema);

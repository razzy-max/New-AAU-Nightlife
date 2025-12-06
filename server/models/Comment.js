import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    enum: ['blog', 'event', 'job'],
    required: true,
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentType',
  },
  approved: {
    type: Boolean,
    default: false, // Admin approval required
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null, // For nested replies
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
}, {
  timestamps: true,
});

// Index for efficient queries
commentSchema.index({ contentType: 1, contentId: 1, approved: 1 });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
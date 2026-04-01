import mongoose from 'mongoose';
import crypto from 'crypto';

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true,
    default: () => crypto.randomBytes(8).toString('hex').toUpperCase(),
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  eventTitle: {
    type: String,
    required: true,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  eventTime: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  ticketTypeName: {
    type: String,
    required: true,
  },
  ticketTypePrice: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  whatsapp: {
    type: String,
    default: '',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  paymentReference: {
    type: String,
  },
  paymentTime: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for search
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ eventId: 1 });
ticketSchema.index({ paymentTime: -1 });
ticketSchema.index({ paymentReference: 1 }, { sparse: true });
ticketSchema.index({ orderId: 1 });
ticketSchema.index({ userId: 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;

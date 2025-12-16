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
    required: true,
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

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;

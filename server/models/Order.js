import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  paymentReference: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  buyerName: {
    type: String,
    required: true,
    trim: true,
  },
  buyerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  buyerWhatsapp: {
    type: String,
    default: '',
    trim: true,
  },
  ticketTypeName: {
    type: String,
    required: true,
  },
  ticketTypePrice: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 15,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
  ticketIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  }],
  claimedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

orderSchema.index({ buyerEmail: 1, userId: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ eventId: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
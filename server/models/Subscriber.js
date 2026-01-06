import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema({
  whatsappNumber: {
    type: String,
    required: [true, 'WhatsApp number is required'],
    unique: true,
    trim: true,
    minlength: [10, 'WhatsApp number must be at least 10 characters']
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed'],
    default: 'active'
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);

export default Subscriber;

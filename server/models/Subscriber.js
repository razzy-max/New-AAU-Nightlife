import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema({
  whatsappNumber: {
    type: String,
    required: [true, 'WhatsApp number is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow numbers with optional country code and common formatting
        return /^[\d\s\-\+\(\)]+$/.test(v) && v.replace(/\D/g, '').length >= 10;
      },
      message: 'Please enter a valid WhatsApp number (at least 10 digits)'
    }
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

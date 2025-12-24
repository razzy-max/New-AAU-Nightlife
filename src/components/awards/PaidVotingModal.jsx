import React, { useState } from 'react';
import './PaidVotingModal.css';

const PaidVotingModal = ({ candidate, category, onConfirm, onCancel }) => {
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const pricePerVote = category.pricePerVote || 100;
  const totalCost = quantity * pricePerVote;

  const handleConfirm = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    await onConfirm({
      email,
      voteWeight: quantity,
      totalCost,
    });
    setLoading(false);
  };

  return (
    <div className="paid-voting-modal-overlay">
      <div className="paid-voting-modal">
        <div className="modal-header">
          <h2>💰 Purchase Votes</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="modal-body">
          <div className="candidate-info">
            <p className="label">Voting For:</p>
            <p className="candidate-name">{candidate.name}</p>
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
            <small>Required for payment verification</small>
          </div>

          <div className="form-group">
            <label>Number of Votes (1-100) *</label>
            <div className="quantity-input-group">
              <button 
                className="qty-btn" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(Math.max(val, 1), 100));
                }}
              />
              <button 
                className="qty-btn" 
                onClick={() => setQuantity(Math.min(100, quantity + 1))}
                disabled={quantity >= 100}
              >
                +
              </button>
            </div>
          </div>

          <div className="pricing-breakdown">
            <div className="price-row">
              <span>Price per vote:</span>
              <span>₦{pricePerVote.toLocaleString()}</span>
            </div>
            <div className="price-row">
              <span>Quantity:</span>
              <span>{quantity}x</span>
            </div>
            <div className="price-row total">
              <span>Total Cost:</span>
              <span>₦{totalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn-cancel" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn-confirm" 
            onClick={handleConfirm}
            disabled={loading || !email}
          >
            {loading ? 'Processing...' : `Proceed to Payment (₦${totalCost.toLocaleString()})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaidVotingModal;

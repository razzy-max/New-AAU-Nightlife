import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import CountdownTimer from '../components/awards/CountdownTimer';
import ProgressBar from '../components/awards/ProgressBar';
import Leaderboard from '../components/awards/Leaderboard';
import useVoteUpdates from '../hooks/useVoteUpdates';
import './Awards.css';

const Awards = () => {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votingStatus, setVotingStatus] = useState('inactive');
  const [activeTab, setActiveTab] = useState('vote');
  const [voteQuantities, setVoteQuantities] = useState({}); // Store quantities per candidate
  const hasScrolledRef = useRef(false); // Track if we've already scrolled
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem('voteSessionId');
    if (stored) return stored;
    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('voteSessionId', newId);
    return newId;
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchCandidates(selectedCategory._id);
    }
  }, [selectedCategory]);

  // Scroll to hash anchor if present (only once)
  useEffect(() => {
    if (window.location.hash && !hasScrolledRef.current) {
      const elementId = window.location.hash.slice(1); // Remove # prefix
      const element = document.getElementById(elementId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          hasScrolledRef.current = true; // Mark that we've scrolled
          
          // Clean up URL after scroll completes (remove hash and category params)
          setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 1000); // Wait for scroll animation to finish
        }, 100);
      }
    }
  }, [selectedCategory]); // Scroll when category changes (after DOM is ready)

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/categories`);
      const data = await response.json();

      if (data.success) {
        const activeCategories = data.data.filter((cat) => cat.status === 'active');
        setCategories(data.data);
        
        // Check if returning from payment callback or URL has category param
        const categoryParam = searchParams.get('category');
        let categoryToSelect = null;

        if (categoryParam) {
          // Find the category from URL parameter
          categoryToSelect = data.data.find(cat => cat._id === categoryParam);
        }

        // If no return category, use active categories or first available
        if (!categoryToSelect) {
          categoryToSelect = activeCategories.length > 0 ? activeCategories[0] : data.data[0];
        }

        if (categoryToSelect) {
          setSelectedCategory(categoryToSelect);
        }
      }
    } catch (err) {
      setError('Failed to fetch categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (categoryId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/candidates/category/${categoryId}`
      );
      const data = await response.json();

      if (data.success) {
        setCandidates(data.data.sort((a, b) => b.voteCount - a.voteCount));
        
        // Update the total votes on the selected category based on sum of candidate votes
        const totalVotes = data.data.reduce((sum, candidate) => sum + candidate.voteCount, 0);
        setSelectedCategory(prev => ({ ...prev, totalVotes }));
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
  };

  // Setup SSE for real-time vote updates
  const handleVoteUpdate = (updatedCandidate) => {
    setCandidates(prev => {
      // Find and update the candidate that received the vote
      const updated = prev.map(candidate =>
        candidate._id === updatedCandidate._id
          ? updatedCandidate
          : candidate
      );

      // Re-sort by vote count to update leaderboard in real-time
      return updated.sort((a, b) => b.voteCount - a.voteCount);
    });

    // Update total votes in selected category
    setSelectedCategory(prev => {
      const totalVotes = candidates.reduce((sum, candidate) => 
        sum + (candidate._id === updatedCandidate._id ? updatedCandidate.voteCount : candidate.voteCount), 0
      );
      return { ...prev, totalVotes };
    });
  };

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  useVoteUpdates(handleVoteUpdate, apiBaseUrl);

  const getStatusBasedOnDates = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return 'upcoming';
    } else if (now >= start && now <= end) {
      return 'active';
    } else {
      return 'ended';
    }
  };

  const handleVote = async (candidateId, voteType = 'free') => {
    if (votingStatus !== 'active') {
      alert('Voting is not active for this category');
      return;
    }

    try {
      if (voteType === 'free') {
        // Show simple confirmation for free voting
        const candidateName = candidates.find(c => c._id === candidateId)?.name || 'the candidate';
        const confirmed = window.confirm(`Are you sure you want to vote for "${candidateName}"?\n\nYou have only one free vote for this category.`);
        
        if (!confirmed) return;

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/voting/vote/free`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId,
          },
          body: JSON.stringify({
            candidateId,
            categoryId: selectedCategory._id,
            captchaToken: 'no-captcha-free',
          }),
        });

        const data = await response.json();

        if (data.success) {
          alert('Vote recorded successfully!');
          fetchCandidates(selectedCategory._id);
        } else {
          alert(data.message || 'Failed to record vote');
        }
      } else {
        // Handle paid voting with Paystack
        handlePaidVote(candidateId);
      }
    } catch (err) {
      console.error('Voting error:', err);
      alert('Failed to record vote');
    }
  };

  const handlePaidVote = async (candidateId) => {
    try {
      const email = prompt('Enter your email for payment:');
      if (!email) return;

      // Get quantity from state
      const voteCount = voteQuantities[candidateId] || 1;
      const pricePerVote = selectedCategory.pricePerVote || 100;
      const totalCost = voteCount * pricePerVote;

      const confirmed = window.confirm(`You are about to vote ${voteCount} time(s).\n\nTotal Cost: ₦${totalCost.toLocaleString()}\n\nClick OK to proceed to payment.`);
      if (!confirmed) return;

      // Step 1: Initialize payment
      const initResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/payments/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          categoryId: selectedCategory._id,
          voteCount,
          email,
        }),
      });

      const initData = await initResponse.json();

      if (!initData.success) {
        alert(initData.message || 'Failed to initialize payment');
        return;
      }

      // Store vote details for later verification
      sessionStorage.setItem('pendingVote', JSON.stringify({
        candidateId,
        categoryId: selectedCategory._id,
        voteCount,
        reference: initData.data.reference,
      }));

      // Store category to return to
      sessionStorage.setItem('returnToCategoryId', selectedCategory._id);

      // Step 2: Redirect to Paystack
      window.location.href = initData.data.authorizationUrl;
    } catch (err) {
      console.error('Payment error:', err);
      alert('Failed to process payment');
    }
  };

  if (loading) {
    return <div className="awards-loading">Loading Awards...</div>;
  }

  if (error) {
    return <div className="awards-error">{error}</div>;
  }

  return (
    <div className="awards-page">
      <div className="awards-hero">
        <div className="hero-content">
          <h1>🏆 AAU Nightlife Awards</h1>
          <p>Vote for your favorite nominees and winners!</p>
        </div>
      </div>

      <div className="awards-container">
        {/* Category Selector */}
        <div className="category-selector">
          <h2>Select Category</h2>
          <div className="category-grid">
            {categories.map((category) => (
              <button
                key={category._id}
                className={`category-card ${selectedCategory?._id === category._id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
                title={`Start: ${new Date(category.startDate).toLocaleString()} | End: ${new Date(category.endDate).toLocaleString()}`}
              >
                <div className="category-name">{category.name}</div>
                <div className="category-badges">
                  <span className={`voting-type-badge ${category.pricingType}`}>
                    {category.pricingType === 'free' ? '🆓 FREE' : `💰 ₦${category.pricePerVote}`}
                  </span>
                  <span className={`status-badge ${getStatusBasedOnDates(category.startDate, category.endDate)}`}>
                    {getStatusBasedOnDates(category.startDate, category.endDate)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Voting Section */}
        {selectedCategory && (
          <>
            <div className="voting-section">
              <CountdownTimer
                startDate={selectedCategory.startDate}
                endDate={selectedCategory.endDate}
                onStatusChange={setVotingStatus}
              />

              {/* Tabs */}
              <div className="voting-tabs">
                <button
                  className={`tab-btn ${activeTab === 'vote' ? 'active' : ''}`}
                  onClick={() => setActiveTab('vote')}
                >
                  🗳️ Vote
                </button>
                <button
                  className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('leaderboard')}
                >
                  🏅 Leaderboard
                </button>
              </div>

              {/* Vote Tab */}
              {activeTab === 'vote' && (
                <div className="vote-tab-content">
                  <h3>Choose your candidate:</h3>
                  {candidates.length > 0 ? (
                    <div className="candidates-container">
                      {candidates.map((candidate) => (
                        <div key={candidate._id} className="candidate-card">
                          {candidate.image && (
                            <img
                              src={candidate.image}
                              alt={candidate.name}
                              className="candidate-image"
                            />
                          )}
                          <div className="candidate-details">
                            <h4>{candidate.name}</h4>
                            <p className="candidate-description">{candidate.description}</p>
                            <div className="candidate-stats">
                              <span>Votes: {candidate.voteCount || 0}</span>
                            </div>
                          </div>
                          <div className="voting-buttons">
                            {selectedCategory.pricingType === 'free' ? (
                              <button
                                className="vote-btn free-vote full-width"
                                onClick={() => handleVote(candidate._id, 'free')}
                                disabled={votingStatus !== 'active'}
                              >
                                🆓 Cast Vote
                              </button>
                            ) : (
                              <div className="paid-vote-section">
                                <div className="quantity-controls">
                                  <button 
                                    className="qty-btn"
                                    onClick={() => setVoteQuantities({
                                      ...voteQuantities,
                                      [candidate._id]: Math.max(1, (voteQuantities[candidate._id] || 1) - 1)
                                    })}
                                  >
                                    −
                                  </button>
                                  <span className="qty-display">{voteQuantities[candidate._id] || 1}</span>
                                  <button 
                                    className="qty-btn"
                                    onClick={() => setVoteQuantities({
                                      ...voteQuantities,
                                      [candidate._id]: Math.min(100, (voteQuantities[candidate._id] || 1) + 1)
                                    })}
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="cost-display">
                                  ₦{((voteQuantities[candidate._id] || 1) * (selectedCategory.pricePerVote || 100)).toLocaleString()}
                                </div>
                                <button
                                  className="vote-btn paid-vote full-width"
                                  onClick={() => handleVote(candidate._id, 'paid')}
                                  disabled={votingStatus !== 'active'}
                                >
                                  💰 Buy Votes
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-candidates">No candidates available</div>
                  )}

                  {/* Progress Bars */}
                  <div id="vote-distribution" className="progress-section">
                    <h3>Vote Distribution</h3>
                    {candidates.map((candidate) => (
                      <ProgressBar
                        key={candidate._id}
                        candidate={candidate}
                        totalVotes={selectedCategory.totalVotes}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard Tab */}
              {activeTab === 'leaderboard' && (
                <div className="leaderboard-tab-content">
                  <Leaderboard candidates={candidates} category={selectedCategory} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Awards;

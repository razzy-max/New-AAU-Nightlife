import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import CountdownTimer from '../components/awards/CountdownTimer';
import ProgressBar from '../components/awards/ProgressBar';
import Leaderboard from '../components/awards/Leaderboard';
import PaidVotingModal from '../components/awards/PaidVotingModal';
import useVoteUpdates from '../hooks/useVoteUpdates';
import API_BASE_URL from '../config';
import './EventAwards.css';

const EventAwards = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votingStatus, setVotingStatus] = useState('inactive');
  const [activeTab, setActiveTab] = useState('vote');
  const [paidModalCandidate, setPaidModalCandidate] = useState(null);
  const hasScrolledRef = useRef(false);
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem('voteSessionId');
    if (stored) return stored;
    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('voteSessionId', newId);
    return newId;
  });

  useEffect(() => {
    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (selectedCategory) {
      fetchCandidates(selectedCategory._id);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (window.location.hash && !hasScrolledRef.current) {
      const elementId = window.location.hash.slice(1);
      const element = document.getElementById(elementId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          hasScrolledRef.current = true;
          setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 1000);
        }, 100);
      }
    }
  }, [selectedCategory]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/awards-events/public/${slug}`);
      const data = await response.json();

      if (!data.success) {
        setError('Awards event not found');
        return;
      }

      setEvent(data.data);
      await fetchCategories(data.data._id);
    } catch (err) {
      setError('Failed to fetch this awards event');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (awardsEventId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/awards/categories?awardsEvent=${awardsEventId}`);
      const data = await response.json();

      if (data.success) {
        const activeCategories = data.data.filter((cat) => cat.status === 'active');
        setCategories(data.data);

        const categoryParam = searchParams.get('category');
        let categoryToSelect = null;

        if (categoryParam) {
          categoryToSelect = data.data.find((cat) => cat._id === categoryParam);
        }

        if (!categoryToSelect) {
          categoryToSelect = activeCategories.length > 0 ? activeCategories[0] : data.data[0];
        }

        if (categoryToSelect) {
          setSelectedCategory(categoryToSelect);
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchCandidates = async (categoryId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/awards/candidates/category/${categoryId}`);
      const data = await response.json();

      if (data.success) {
        setCandidates(data.data.sort((a, b) => b.voteCount - a.voteCount));
        const totalVotes = data.data.reduce((sum, candidate) => sum + candidate.voteCount, 0);
        setSelectedCategory((prev) => (prev ? { ...prev, totalVotes } : prev));
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
  };

  const handleVoteUpdate = (updatedCandidate) => {
    setCandidates((prev) => {
      const updated = prev.map((candidate) =>
        candidate._id === updatedCandidate._id ? updatedCandidate : candidate
      );
      return updated.sort((a, b) => b.voteCount - a.voteCount);
    });

    setSelectedCategory((prev) => {
      if (!prev) return prev;
      const totalVotes = candidates.reduce(
        (sum, candidate) =>
          sum + (candidate._id === updatedCandidate._id ? updatedCandidate.voteCount : candidate.voteCount),
        0
      );
      return { ...prev, totalVotes };
    });
  };

  useVoteUpdates(handleVoteUpdate, API_BASE_URL, event?._id);

  const handleFreeVote = async (candidateId) => {
    if (votingStatus !== 'active') {
      alert('Voting is not active for this category');
      return;
    }

    const candidateName = candidates.find((c) => c._id === candidateId)?.name || 'the candidate';
    const confirmed = window.confirm(
      `Are you sure you want to vote for "${candidateName}"?\n\nYou have only one free vote for this category.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/voting/vote/free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
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
    } catch (err) {
      console.error('Voting error:', err);
      alert('Failed to record vote');
    }
  };

  const handlePaidVoteConfirm = async ({ email, voteWeight }) => {
    try {
      const initResponse = await fetch(`${API_BASE_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: paidModalCandidate._id,
          categoryId: selectedCategory._id,
          voteCount: voteWeight,
          email,
        }),
      });

      const initData = await initResponse.json();
      if (!initData.success) {
        alert(initData.message || 'Failed to initialize payment');
        return;
      }

      sessionStorage.setItem(
        'pendingVote',
        JSON.stringify({
          candidateId: paidModalCandidate._id,
          categoryId: selectedCategory._id,
          voteCount: voteWeight,
          reference: initData.data.reference,
        })
      );
      sessionStorage.setItem('returnToCategoryId', selectedCategory._id);
      sessionStorage.setItem('returnToEventSlug', slug);

      window.location.href = initData.data.authorizationUrl;
    } catch (err) {
      console.error('Payment error:', err);
      alert('Failed to process payment');
    }
  };

  if (loading) {
    return <div className="awards-loading">Loading Awards...</div>;
  }

  if (error || !event) {
    return (
      <div className="awards-error">
        {error || 'Awards event not found'}
        <div style={{ marginTop: '1rem' }}>
          <button className="vote-btn free-vote" onClick={() => navigate('/awards')}>
            Back to Awards Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="awards-page">
      <div className="awards-hero">
        {event.coverImage && <img src={event.coverImage} alt="" className="awards-hero-cover" />}
        <div className="hero-content">
          <h1>🏆 {event.title}</h1>
          <p>{event.description}</p>
          <span className="hero-organizer">Organized by {event.organizerName}</span>
        </div>
      </div>

      <div className="awards-container">
        <div className="category-selector">
          <h2>Select Category</h2>
          <div className="category-grid">
            {categories.map((category) => (
              <button
                key={category._id}
                className={`category-card ${selectedCategory?._id === category._id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                <div className="category-name">{category.name}</div>
                <div className="category-badges">
                  <span className={`voting-type-badge ${category.pricingType}`}>
                    {category.pricingType === 'free' ? '🆓 FREE' : `💰 ₦${category.pricePerVote}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedCategory && (
          <div className="voting-section">
            <CountdownTimer
              startDate={selectedCategory.startDate}
              endDate={selectedCategory.endDate}
              onStatusChange={setVotingStatus}
            />

            <div className="voting-tabs">
              <button className={`tab-btn ${activeTab === 'vote' ? 'active' : ''}`} onClick={() => setActiveTab('vote')}>
                🗳️ Vote
              </button>
              <button className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
                🏅 Leaderboard
              </button>
            </div>

            {activeTab === 'vote' && (
              <div className="vote-tab-content">
                <h3>Choose your candidate:</h3>
                {candidates.length > 0 ? (
                  <div className="candidates-container">
                    {candidates.map((candidate) => (
                      <div key={candidate._id} className="candidate-card">
                        {candidate.image && (
                          <img src={candidate.image} alt={candidate.name} className="candidate-image" />
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
                              onClick={() => handleFreeVote(candidate._id)}
                              disabled={votingStatus !== 'active'}
                            >
                              🆓 Cast Vote
                            </button>
                          ) : (
                            <button
                              className="vote-btn paid-vote full-width"
                              onClick={() => setPaidModalCandidate(candidate)}
                              disabled={votingStatus !== 'active'}
                            >
                              💰 Buy Votes
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-candidates">No candidates available</div>
                )}

                <div id="vote-distribution" className="progress-section">
                  <h3>Vote Distribution</h3>
                  {candidates.map((candidate) => (
                    <ProgressBar key={candidate._id} candidate={candidate} totalVotes={selectedCategory.totalVotes} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="leaderboard-tab-content">
                <Leaderboard candidates={candidates} category={selectedCategory} />
              </div>
            )}
          </div>
        )}
      </div>

      {paidModalCandidate && (
        <PaidVotingModal
          candidate={paidModalCandidate}
          category={selectedCategory}
          onConfirm={handlePaidVoteConfirm}
          onCancel={() => setPaidModalCandidate(null)}
        />
      )}
    </div>
  );
};

export default EventAwards;

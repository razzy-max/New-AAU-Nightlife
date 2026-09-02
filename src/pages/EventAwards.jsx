import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import CountdownTimer from '../components/awards/CountdownTimer';
import ProgressBar from '../components/awards/ProgressBar';
import Leaderboard from '../components/awards/Leaderboard';
import PaidVotingModal from '../components/awards/PaidVotingModal';
import VoteToast from '../components/awards/VoteToast';
import useVoteUpdates from '../hooks/useVoteUpdates';
import API_BASE_URL from '../config';
import '../components/awards/skeleton.css';
import './EventAwards.css';

function EventAwardsSkeleton() {
  return (
    <div className="awards-page">
      <div className="awards-hero skeleton" style={{ height: '220px', border: 'none' }} />
      <div className="awards-container">
        <div className="skeleton" style={{ height: '140px', marginBottom: '2rem' }} />
        <div className="category-selector">
          <div className="skeleton" style={{ height: '1.5rem', width: '30%', marginBottom: '1.5rem' }} />
          <div className="category-grid">
            <div className="skeleton" style={{ height: '90px' }} />
            <div className="skeleton" style={{ height: '90px' }} />
          </div>
        </div>
        <div className="candidates-container" style={{ marginTop: '2rem' }}>
          <div className="skeleton" style={{ height: '320px' }} />
          <div className="skeleton" style={{ height: '320px' }} />
        </div>
      </div>
    </div>
  );
}

const EventAwards = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votingStatus, setVotingStatus] = useState('inactive');
  const [activeTab, setActiveTab] = useState('vote');
  const [paidModalCandidate, setPaidModalCandidate] = useState(null);
  const [toast, setToast] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [highlightCandidateId, setHighlightCandidateId] = useState(null);
  const hasScrolledRef = useRef(false);
  const candidateCardRefs = useRef({});
  const votingSectionRef = useRef(null);

  const showToast = (type, message) => setToast({ type, message, key: Date.now() });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?._id]);

  // Once the target category's candidates are loaded, scroll to and briefly
  // highlight whichever candidate was picked from a global search result.
  useEffect(() => {
    if (!highlightCandidateId) return undefined;
    const node = candidateCardRefs.current[highlightCandidateId];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => setHighlightCandidateId(null), 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [candidates, highlightCandidateId]);

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
      await Promise.all([fetchCategories(data.data._id), fetchAllCandidates(data.data._id)]);
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

  // Powers the global search box - every candidate across every category in this event.
  const fetchAllCandidates = async (awardsEventId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/awards/candidates?awardsEvent=${awardsEventId}`);
      const data = await response.json();
      if (data.success) {
        setAllCandidates(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch all candidates:', err);
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

  // Kept stable (no external deps) so the SSE connection in useVoteUpdates
  // doesn't tear down and reconnect on every render/vote.
  const handleVoteUpdate = useCallback((updatedCandidate) => {
    setCandidates((prev) => {
      const updated = prev.map((candidate) =>
        candidate._id === updatedCandidate._id ? updatedCandidate : candidate
      );
      const sorted = updated.sort((a, b) => b.voteCount - a.voteCount);
      const totalVotes = sorted.reduce((sum, candidate) => sum + candidate.voteCount, 0);
      setSelectedCategory((prev) => (prev ? { ...prev, totalVotes } : prev));
      return sorted;
    });
    setAllCandidates((prev) => prev.map((c) => (c._id === updatedCandidate._id ? { ...c, ...updatedCandidate } : c)));
  }, []);

  useVoteUpdates(handleVoteUpdate, API_BASE_URL, event?._id);

  const selectCategory = (category) => {
    setSelectedCategory((prev) => (prev?._id === category._id ? prev : category));
  };

  const handleSelectCategoryResult = (category) => {
    setGlobalSearch('');
    selectCategory(category);
    setTimeout(() => votingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleSelectCandidateResult = (candidate) => {
    const categoryId = candidate.category?._id || candidate.category;
    const targetCategory = categories.find((c) => c._id === categoryId);
    if (!targetCategory) return;
    setGlobalSearch('');
    setActiveTab('vote');
    setHighlightCandidateId(candidate._id);
    selectCategory(targetCategory);
  };

  const handleFreeVote = async (candidateId) => {
    if (votingStatus !== 'active') {
      showToast('error', 'Voting is not active for this category right now.');
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
        showToast('success', `Your vote for "${candidateName}" has been recorded. Thanks for voting!`);
        fetchCandidates(selectedCategory._id);
      } else {
        showToast('error', data.message || 'Failed to record your vote. Please try again.');
      }
    } catch (err) {
      console.error('Voting error:', err);
      showToast('error', 'Failed to record your vote. Please check your connection and try again.');
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
        showToast('error', initData.message || 'Failed to initialize payment. Please try again.');
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
      showToast('error', 'Failed to start the payment process. Please try again.');
    }
  };

  if (loading) {
    return <EventAwardsSkeleton />;
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

  const searchQuery = globalSearch.trim().toLowerCase();
  const matchedCategories = searchQuery
    ? categories.filter((c) => c.name.toLowerCase().includes(searchQuery))
    : [];
  const matchedCandidates = searchQuery
    ? allCandidates.filter((c) => c.name.toLowerCase().includes(searchQuery))
    : [];

  return (
    <div className="awards-page">
      <div className="awards-hero">
        {event.coverImage && (
          <>
            <img src={event.coverImage} alt="" className="awards-hero-cover" />
            <div className="awards-hero-scrim" />
          </>
        )}
        <div className="hero-content">
          <h1>🏆 {event.title}</h1>
          <p>{event.description}</p>
          <span className="hero-organizer">Organized by {event.organizerName}</span>
        </div>
      </div>

      <div className="awards-container">
        <CountdownTimer
          startDate={event.votingStartsAt}
          endDate={event.votingEndsAt}
          onStatusChange={setVotingStatus}
        />

        <div className="global-search-wrapper">
          <div className="awards-search-box awards-search-box-large">
            <span className="awards-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search any candidate or category..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            {globalSearch && (
              <button className="awards-search-clear" onClick={() => setGlobalSearch('')} aria-label="Clear search">
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="global-search-results">
              {matchedCategories.length === 0 && matchedCandidates.length === 0 && (
                <div className="global-search-empty">No matches for "{globalSearch}"</div>
              )}

              {matchedCategories.length > 0 && (
                <div className="global-search-group">
                  <p className="global-search-group-label">Categories</p>
                  {matchedCategories.map((category) => (
                    <button
                      key={category._id}
                      className="global-search-result"
                      onClick={() => handleSelectCategoryResult(category)}
                    >
                      <span className="global-search-result-name">{category.name}</span>
                      <span className={`voting-type-badge ${category.pricingType}`}>
                        {category.pricingType === 'free' ? '🆓 FREE' : `💰 ₦${category.pricePerVote}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {matchedCandidates.length > 0 && (
                <div className="global-search-group">
                  <p className="global-search-group-label">Candidates</p>
                  {matchedCandidates.map((candidate) => (
                    <button
                      key={candidate._id}
                      className="global-search-result"
                      onClick={() => handleSelectCandidateResult(candidate)}
                    >
                      <span className="global-search-result-name">{candidate.name}</span>
                      <span className="global-search-result-meta">
                        in {candidate.category?.name || 'a category'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="category-selector">
          <h2>Select Category</h2>
          <div className={`category-grid ${categories.length > 6 ? 'scrollable' : ''}`}>
            {categories.map((category) => (
              <button
                key={category._id}
                className={`category-card ${selectedCategory?._id === category._id ? 'active' : ''}`}
                onClick={() => selectCategory(category)}
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
          <div className="voting-section" ref={votingSectionRef}>
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
                      <div
                        key={candidate._id}
                        ref={(el) => {
                          candidateCardRefs.current[candidate._id] = el;
                        }}
                        className={`candidate-card ${candidates[0]?._id === candidate._id && candidate.voteCount > 0 ? 'leading' : ''} ${highlightCandidateId === candidate._id ? 'search-highlighted' : ''}`}
                      >
                        {candidates[0]?._id === candidate._id && candidate.voteCount > 0 && (
                          <span className="candidate-leading-tag">👑 Leading</span>
                        )}
                        {candidate.image ? (
                          <img src={candidate.image} alt={candidate.name} className="candidate-image" />
                        ) : (
                          <div className="candidate-image candidate-image-placeholder">
                            <span>{candidate.name?.charAt(0)?.toUpperCase() || '?'}</span>
                          </div>
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

      <VoteToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default EventAwards;

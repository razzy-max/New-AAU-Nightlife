import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [gridRef, gridVisible] = useScrollAnimation();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Check if we have cached data
        const cachedData = sessionStorage.getItem('jobs_cache');
        const cacheTimestamp = sessionStorage.getItem('jobs_cache_timestamp');
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

        // Use cached data if it exists and is fresh
        if (cachedData && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < cacheMaxAge) {
            setJobs(JSON.parse(cachedData));
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data
        const response = await fetch(`${API_BASE_URL}/api/jobs`);
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const data = await response.json();
        const jobsData = data.jobs || [];
        
        setJobs(jobsData);
        
        // Cache the data
        sessionStorage.setItem('jobs_cache', JSON.stringify(jobsData));
        sessionStorage.setItem('jobs_cache_timestamp', Date.now().toString());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [refreshTrigger]);

  // Function to refresh jobs data (exposed globally for admin use)
  const refreshJobsData = () => {
    sessionStorage.removeItem('jobs_cache');
    sessionStorage.removeItem('jobs_cache_timestamp');
    setRefreshTrigger(prev => prev + 1);
  };

  // Expose refresh function globally
  useEffect(() => {
    window.refreshJobsData = refreshJobsData;
    return () => {
      delete window.refreshJobsData;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div>
      <section className="jobs-header">
        <h1>Job Opportunities</h1>
        <p>Find exciting career opportunities in the AAU nightlife industry</p>
      </section>
      <section className="section jobs-section">
        <div ref={gridRef} className="jobs-grid">
          {jobs.map((job, index) => (
            <div key={job._id} className={`job-card stagger-item ${gridVisible ? 'visible' : ''} delay-${Math.min((index % 3) + 1, 3)}`}>
              <div className="job-header">
                <div className="job-type-badge">{job.type}</div>
                <h3>{job.title}</h3>
                <p className="job-company">{job.company}</p>
              </div>
              <div className="job-content">
                <p className="job-location">📍 {job.location}</p>
                <p className="job-description">{job.description}</p>
                <div className="job-details">
                  <p><strong>Requirements:</strong> {job.requirements}</p>
                  <p><strong>Salary:</strong> {job.salary}</p>
                </div>
                <div className="job-apply-buttons">
                  {job.whatsappNumber && (
                    <a
                      href={`https://wa.me/${job.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in applying for the ${job.title} position at ${job.company}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apply-btn whatsapp-btn"
                    >
                      Apply via WhatsApp
                    </a>
                  )}
                  {job.contactEmail && (
                    <a
                      href={`mailto:${job.contactEmail}?subject=Application for ${job.title}&body=Hi, I'm interested in applying for the ${job.title} position at ${job.company}.`}
                      className="apply-btn email-btn"
                    >
                      Apply via Email
                    </a>
                  )}
                  {!job.whatsappNumber && !job.contactEmail && (
                    <button className="apply-btn physical-btn" disabled>
                      Apply Physically
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Jobs;
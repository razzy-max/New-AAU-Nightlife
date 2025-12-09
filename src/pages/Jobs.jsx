import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs`);
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const data = await response.json();
        setJobs(data.jobs || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
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
        <div className="jobs-grid">
          {jobs.map(job => (
            <div key={job._id} className="job-card">
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
                <button className="apply-btn">Apply Now</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Jobs;
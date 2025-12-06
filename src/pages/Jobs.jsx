function Jobs() {
  const jobs = [
    {
      id: 1,
      title: 'Event Bartender',
      company: 'Club X Nightlife',
      location: 'Ekpoma, AAU',
      description: 'Join our dynamic team at Club X as an Event Bartender! We\'re looking for enthusiastic individuals with a passion for mixology and customer service. This role involves preparing and serving beverages, maintaining bar cleanliness, and providing excellent guest experiences during our exciting nightlife events.\n\nRequirements:\n- Basic knowledge of cocktails and beverages\n- Excellent communication skills\n- Ability to work flexible hours (evenings and weekends)\n- Friendly and outgoing personality\n- Age 18+ preferred',
      salary: '₦50,000 - ₦80,000/month',
      type: 'Part-time',
      image: 'https://via.placeholder.com/400x250/FFD700/000000?text=Bartender+Position'
    },
    {
      id: 2,
      title: 'Event Coordinator',
      company: 'AAU Nightlife Events',
      location: 'Ekpoma, AAU',
      description: 'Are you organized, creative, and passionate about student life? We\'re seeking an Event Coordinator to help plan and execute unforgettable nightlife experiences for AAU students. This role involves coordinating with vendors, managing event logistics, and ensuring smooth operations from planning to execution.\n\nKey Responsibilities:\n- Plan and coordinate campus events\n- Liaise with vendors and sponsors\n- Manage event budgets and timelines\n- Coordinate volunteer teams\n- Ensure compliance with university policies',
      salary: '₦70,000 - ₦120,000/month',
      type: 'Full-time',
      image: 'https://via.placeholder.com/400x250/000000/FFD700?text=Event+Coordinator'
    },
    {
      id: 3,
      title: 'Social Media Manager',
      company: 'AAU Nightlife',
      location: 'Ekpoma, AAU',
      description: 'Help us amplify the AAU Nightlife brand! We\'re looking for a creative Social Media Manager to handle our online presence, engage with our student community, and promote upcoming events. This role is perfect for someone who loves social media and understands the student demographic.\n\nWhat You\'ll Do:\n- Create engaging content for Instagram, TikTok, and Facebook\n- Manage social media campaigns\n- Analyze engagement metrics\n- Collaborate with event teams\n- Build and maintain online community',
      salary: '₦60,000 - ₦100,000/month',
      type: 'Part-time',
      image: 'https://via.placeholder.com/400x250/FFD700/000000?text=Social+Media+Manager'
    }
  ];

  return (
    <div>
      <section className="jobs-header">
        <h1>Job Opportunities</h1>
        <p>Find exciting career opportunities in the AAU nightlife industry</p>
      </section>
      <section className="section jobs-section">
        <div className="jobs-grid">
          {jobs.map(job => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <div className="job-type-badge">{job.type}</div>
                <h3>{job.title}</h3>
                <p className="job-company">{job.company}</p>
              </div>
              <div className="job-content">
                <p className="job-location">📍 {job.location}</p>
                <p className="job-description">{job.description}</p>
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
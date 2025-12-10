import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

function Carousel() {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlides();
  }, []);

  useEffect(() => {
    if (slides.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
      }, 4000); // Change slide every 4 seconds

      return () => clearInterval(interval);
    }
  }, [slides.length]);

  const fetchSlides = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/carousel`);
      if (response.ok) {
        const data = await response.json();
        setSlides(data);
      }
    } catch (error) {
      console.error('Error fetching carousel slides:', error);
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function to window for admin cache refresh
  useEffect(() => {
    window.refreshCarouselData = fetchSlides;
    return () => {
      delete window.refreshCarouselData;
    };
  }, []);

  if (loading) {
    return (
      <div className="carousel">
        <div className="carousel-slide active" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          AAU Nightlife
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="carousel">
        <div className="carousel-slide active" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          Welcome to AAU Nightlife
        </div>
      </div>
    );
  }

  return (
    <div className="carousel">
      {slides.map((slide, index) => (
        <div
          key={slide._id}
          className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
          style={{ backgroundImage: `url(${slide.image})` }}
        >
          <div className="carousel-content">
            <div className="carousel-text">
              <h1>{slide.title}</h1>
              {slide.description && (
                <p>{slide.description}</p>
              )}
              {slide.link && (
                <a href={slide.link} className="carousel-btn">
                  Learn More
                </a>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation dots */}
      <div className="carousel-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>

      {/* Navigation arrows */}
      <button
        className="carousel-arrow carousel-arrow-left"
        onClick={() => setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length)}
      >
        ‹
      </button>
      <button
        className="carousel-arrow carousel-arrow-right"
        onClick={() => setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length)}
      >
        ›
      </button>
    </div>
  );
}

export default Carousel;
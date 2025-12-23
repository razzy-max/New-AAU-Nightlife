import { useEffect, useRef, useState } from 'react';

export const useScrollAnimation = (threshold = 0.1) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState(null);

  // Track when ref gets attached
  useEffect(() => {
    if (ref.current && ref.current !== element) {
      setElement(ref.current);
    }
  });

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { 
        threshold,
        rootMargin: '100px'
      }
    );

    // Check if element is in viewport
    const checkInitialVisibility = () => {
      const rect = element.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (isInViewport) {
        setIsVisible(true);
      }
    };

    // Check immediately and after small delay
    checkInitialVisibility();
    const timer = setTimeout(checkInitialVisibility, 100);
    
    observer.observe(element);

    return () => {
      clearTimeout(timer);
      observer.unobserve(element);
    };
  }, [element, threshold]);

  return [ref, isVisible];
};

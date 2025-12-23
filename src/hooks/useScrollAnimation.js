import { useEffect, useRef, useState } from 'react';

export const useScrollAnimation = (threshold = 0.1) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Small delay to let React finish rendering
    const mountTimer = setTimeout(() => {
      setIsMounted(true);
    }, 50);

    return () => clearTimeout(mountTimer);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { 
        threshold,
        rootMargin: '100px'
      }
    );

    // Check if already in viewport
    const checkVisibility = () => {
      const rect = currentRef.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setIsVisible(true);
      }
    };

    checkVisibility();
    
    // Add a fallback check for slow-loading content (first visits with API calls)
    const fallbackTimer = setTimeout(() => {
      checkVisibility();
    }, 300);
    
    observer.observe(currentRef);

    return () => {
      clearTimeout(fallbackTimer);
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, isMounted]);

  return [ref, isVisible];
};

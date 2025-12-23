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
      if (!currentRef) return;
      const rect = currentRef.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setIsVisible(true);
      }
    };

    checkVisibility();
    
    // Watch for when children are added to the container (content loaded from API)
    const mutationObserver = new MutationObserver(() => {
      checkVisibility();
    });
    
    mutationObserver.observe(currentRef, { 
      childList: true, 
      subtree: true 
    });
    
    // Backup timer in case MutationObserver misses the change
    const backupTimer = setTimeout(checkVisibility, 500);
    
    observer.observe(currentRef);

    return () => {
      clearTimeout(backupTimer);
      mutationObserver.disconnect();
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, isMounted]);

  return [ref, isVisible];
};

import { useEffect, useRef, useState } from 'react';

export const useScrollAnimation = (threshold = 0.1) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
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

    // Check immediately
    checkVisibility();
    
    // Watch for when children are added
    const mutationObserver = new MutationObserver(() => {
      checkVisibility();
    });
    
    mutationObserver.observe(currentRef, { 
      childList: true, 
      subtree: true 
    });
    
    // Backup timer
    const backupTimer = setTimeout(checkVisibility, 500);
    
    observer.observe(currentRef);

    return () => {
      clearTimeout(backupTimer);
      mutationObserver.disconnect();
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, ref.current]); // Watch ref.current changes - triggers when grid appears after loading

  return [ref, isVisible];
};

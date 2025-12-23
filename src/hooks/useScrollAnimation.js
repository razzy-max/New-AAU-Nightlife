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

    // Initial check with small delay for DOM to be ready
    setTimeout(checkVisibility, 100);
    
    // Watch for content changes
    const mutationObserver = new MutationObserver(() => {
      checkVisibility();
    });
    
    mutationObserver.observe(currentRef, { 
      childList: true, 
      subtree: true 
    });
    
    // Additional checks for slow first loads
    const timer1 = setTimeout(checkVisibility, 500);
    const timer2 = setTimeout(checkVisibility, 1000);
    
    observer.observe(currentRef);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      mutationObserver.disconnect();
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return [ref, isVisible];
};

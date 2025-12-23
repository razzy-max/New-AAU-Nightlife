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
    
    // Multiple aggressive backup timers for slow first loads
    const timer1 = setTimeout(checkVisibility, 200);
    const timer2 = setTimeout(checkVisibility, 500);
    const timer3 = setTimeout(checkVisibility, 1000);
    const timer4 = setTimeout(checkVisibility, 1500);
    const timer5 = setTimeout(checkVisibility, 2000);
    
    observer.observe(currentRef);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      mutationObserver.disconnect();
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return [ref, isVisible];
};

import { useState, useEffect, useMemo } from 'react';

export const useTypewriter = () => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState('typing'); // typing, pausing, deleting, correcting

  // Generate a random typo letter (not 'e')
  const typoLetter = useMemo(() => {
    const wrongLetters = ['t', 'r', 'w', 'y', 'p', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'z', 'x', 'c', 'v', 'b', 'n', 'm'];
    return wrongLetters[Math.floor(Math.random() * wrongLetters.length)];
  }, []);

  useEffect(() => {
    const text1 = `Welcome to AAU Nightlif${typoLetter}`; // Random typo
    const text2 = 'Welcome to AAU Nightlife'; // Correct text
    let timeout;

    if (phase === 'typing') {
      if (displayText.length < text1.length) {
        timeout = setTimeout(() => {
          setDisplayText(text1.substring(0, displayText.length + 1));
        }, 60);
      } else {
        timeout = setTimeout(() => setPhase('pausing'), 500);
      }
    } else if (phase === 'pausing') {
      timeout = setTimeout(() => setPhase('deleting'), 300);
    } else if (phase === 'deleting') {
      if (displayText.length > 18) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.substring(0, displayText.length - 1));
        }, 30);
      } else {
        setPhase('correcting');
      }
    } else if (phase === 'correcting') {
      if (displayText.length < text2.length) {
        timeout = setTimeout(() => {
          setDisplayText(text2.substring(0, displayText.length + 1));
        }, 60);
      } else {
        setIsComplete(true);
        timeout = setTimeout(() => setShowCursor(false), 1000);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, phase, typoLetter]);

  return { displayText, isComplete, showCursor };
};

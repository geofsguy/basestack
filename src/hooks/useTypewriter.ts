import { useState, useEffect } from 'react';

/**
 * A hook that provides a typewriter effect for an array of strings.
 * Use this for dynamic placeholders or labels.
 */
export function useTypewriter(
  strings: string[],
  typingSpeed: number = 100,
  deletingSpeed: number = 50,
  pauseTime: number = 3000
) {
  const [currentStringIndex, setCurrentStringIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (strings.length === 0) return;

    const fullText = strings[currentStringIndex];
    let timeoutId: number;

    if (isDeleting) {
      // Handle backspacing
      if (currentText === '') {
        setIsDeleting(false);
        setCurrentStringIndex((prev) => (prev + 1) % strings.length);
      } else {
        timeoutId = window.setTimeout(() => {
          setCurrentText(prev => prev.slice(0, -1));
        }, deletingSpeed);
      }
    } else {
      // Handle typing
      if (currentText === fullText) {
        // Pause at the end of the string
        timeoutId = window.setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      } else {
        timeoutId = window.setTimeout(() => {
          setCurrentText(fullText.slice(0, currentText.length + 1));
        }, typingSpeed);
      }
    }

    return () => window.clearTimeout(timeoutId);
  }, [currentText, isDeleting, currentStringIndex, strings, typingSpeed, deletingSpeed, pauseTime]);

  return currentText;
}

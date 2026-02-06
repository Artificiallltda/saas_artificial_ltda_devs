import { useState, useCallback } from 'react';

export function useTour() {
  const [isTourRunning, setIsTourRunning] = useState(false);

  const startTour = useCallback(() => {
    setIsTourRunning(true);
    // Disparar evento para o TourGuide começar
    window.dispatchEvent(new CustomEvent('startTour'));
  }, []);

  const stopTour = useCallback(() => {
    setIsTourRunning(false);
    // Disparar evento para o TourGuide parar
    window.dispatchEvent(new CustomEvent('stopTour'));
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem('hasSeenTour');
  }, []);

  return {
    isTourRunning,
    startTour,
    stopTour,
    resetTour,
  };
}

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function TourButton({ className = "" }) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const startTour = () => {
    setIsLoading(true);
    // Limpar flag para que o tour possa ser iniciado novamente
    localStorage.removeItem('hasSeenTour');
    // Recarregar página para ativar o tour
    window.location.reload();
  };

  return (
    <button
      onClick={startTour}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-2 py-2 text-sm
        bg-white hover:bg-gray-50 text-blue-600
        dark:bg-blue-900/20 dark:hover:bg-blue-800/30 dark:text-blue-400
        rounded-lg transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={t('tour.restart_tour') || 'Reiniciar tour pela plataforma'}
    >
      <PlayCircle className="w-4 h-4" />
      <span>{t('tour.restart_tour') || 'Tour Guiado'}</span>
    </button>
  );
}

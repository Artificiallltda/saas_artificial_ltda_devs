import { PlayCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function TourFloatingButton() {
  const { t } = useLanguage();

  const startTour = () => {
    localStorage.removeItem('hasSeenTour');
    window.location.reload();
  };

  return (
    <button
      onClick={startTour}
      className="
        md:hidden
        fixed bottom-6 right-6
        w-14 h-14
        bg-blue-600 hover:bg-blue-700
        text-white
        rounded-full
        shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-300
        z-40
        group
        animate-bounce-slow
      "
      title={t('tour.restart_tour') || 'Tour Guiado'}
    >
      <PlayCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      
      {/* Tooltip */}
      <div className="
        absolute bottom-full right-0 mb-2
        bg-gray-900 text-white
        px-3 py-1.5 rounded-lg
        text-xs whitespace-nowrap
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        pointer-events-none
        transform translate-x-1/2
      ">
        {t('tour.restart_tour') || 'Tour Guiado'}
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </button>
  );
}

// Adicionar animação customizada
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce-slow {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .animate-bounce-slow {
    animation: bounce-slow 3s infinite;
  }
  
  .animate-bounce-slow:hover {
    animation: none;
  }
`;
document.head.appendChild(style);

import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTourStyles } from './TourStyles';

export default function TourGuide() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [runTour, setRunTour] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  // Desabilitar tour completamente em dispositivos móveis
  const isMobile = window.innerWidth < 1024;
  if (isMobile) {
    return null;
  }
  
  // Injeta estilos customizados
  useTourStyles();

  // Cleanup quando o componente for desmontado
  useEffect(() => {
    return () => {
      document.body.style.filter = 'none';
      document.body.style.webkitFilter = 'none';
      document.body.removeAttribute('data-joyride-overlay');
    };
  }, []);

  // Verificar se é o primeiro login do usuário
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    const isFirstLogin = !hasSeenTour && user;
    
    if (isFirstLogin) {
      setShowWelcomeModal(true);
    }
  }, [user]);

  const startTour = () => {
    setShowWelcomeModal(false);
    setRunTour(true);
    localStorage.setItem('hasSeenTour', 'true');
  };

  const skipTour = () => {
    setShowWelcomeModal(false);
    localStorage.setItem('hasSeenTour', 'true');
  };

  const steps = [
    {
      target: 'body',
      content: t('tour.welcome') || 'Welcome to the Artificiall platform! Let\'s take a guided tour to get to know all the features.',
      title: t('tour.welcome_title') || 'Welcome to Artificiall!',
      placement: 'center',
      disableBeacon: true,
      disableScrolling: true,
    },
    {
      target: '[data-main-sidebar]',
      content: t('tour.sidebar') || 'This is the main menu. Here you find access to all platform features.',
      title: t('tour.sidebar_title') || 'Main Menu',
      placement: 'right',
    },
    {
      target: 'a[href="/"]',
      content: t('tour.dashboard') || 'The Dashboard shows an overview of your activities and usage statistics.',
      title: t('tour.dashboard_title') || 'Dashboard',
      placement: 'right',
    },
    {
      target: 'a[href="/text-generation"]',
      content: t('tour.text_generation') || 'Here you can generate texts using artificial intelligence. Create various types of content automatically.',
      title: t('tour.text_generation_title') || 'Text Generation',
      placement: 'right',
    },
    {
      target: 'a[href="/image-generation"]',
      content: t('tour.image_generation') || 'In this section you can create images using AI. Describe what you want and see the magic happen!',
      title: t('tour.image_generation_title') || 'Image Generation',
      placement: 'right',
    },
    {
      target: 'a[href="/video-generation"]',
      content: t('tour.video_generation') || 'Create impressive videos with artificial intelligence. Transform ideas into audiovisual content.',
      title: t('tour.video_generation_title') || 'Video Generation',
      placement: 'right',
    },
    {
      target: 'a[href="/download-bot"]',
      content: t('tour.download_bot') || 'Automatize downloads premium do Freepik e Envato Elements. Cole o link e o baixamos automaticamente para seu Google Drive.',
      title: t('tour.download_bot_title') || 'Download Automático',
      placement: 'right',
    },
    {
      target: 'a[href="/subscription"]',
      content: t('tour.subscription') || 'Manage your subscription and plans. Choose the plan that best meets your needs.',
      title: t('tour.subscription_title') || 'Subscription',
      placement: 'right',
    },
    {
      target: 'a[href="/profile"]',
      content: t('tour.profile') || 'Access your profile settings and account preferences.',
      title: t('tour.profile_title') || 'My Profile',
      placement: 'right',
    },
    {
      target: 'a[href="/settings"]',
      content: t('tour.settings') || 'Configure platform preferences, notifications and other personal settings.',
      title: t('tour.settings_title') || 'Settings',
      placement: 'right',
    },
  ];

  // Adicionar passo de admin se for usuário admin
  if (user?.role === 'admin') {
    steps.push({
      target: 'a[href="/admin"]',
      content: t('tour.admin') || 'Administrative access to manage users and system configurations.',
      title: t('tour.admin_title') || 'Admin Panel',
      placement: 'right',
    });
  }

  steps.push({
    target: 'body',
    content: t('tour.conclusion') || 'Congratulations! Now you know all the main features of the platform. Explore and make the most of it!',
    title: t('tour.conclusion_title') || 'Tour Completed',
    placement: 'center',
    disableScrolling: true,
  });

  const handleJoyrideCallback = (data) => {
    const { status, type } = data;
    
    // Remove qualquer desfoque global quando o tour iniciar/terminar
    if (type === 'step:before' || type === 'tour:end') {
      document.body.style.filter = 'none';
      document.body.style.webkitFilter = 'none';
      document.body.removeAttribute('data-joyride-overlay');
    }
    
    // Substituir texto do botão para português quando o tour estiver ativo
    if (type === 'step:before') {
      setTimeout(() => {
        const tooltip = document.querySelector('.react-joyride__tooltip');
        if (tooltip) {
          const primaryButton = tooltip.querySelector('[data-action="primary"]');
          if (primaryButton) {
            const buttonText = primaryButton.textContent || primaryButton.innerText;
            // Verifica se está em português brasileiro
            const currentLang = localStorage.getItem('language') || 'pt-BR';
            if (currentLang === 'pt-BR') {
              if (buttonText.includes('Next') || buttonText.includes('Step')) {
                const stepMatch = buttonText.match(/Step (\d+) of (\d+)/);
                if (stepMatch) {
                  primaryButton.textContent = `Próximo (Passo ${stepMatch[1]} de ${stepMatch[2]})`;
                } else {
                  primaryButton.textContent = 'Próximo';
                }
              }
            }
          }
        }
      }, 100);
    }
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      document.body.style.filter = 'none';
      document.body.style.webkitFilter = 'none';
      document.body.removeAttribute('data-joyride-overlay');
    }
  };

  return (
    <>
      {/* Modal de Boas-vindas */}
      {showWelcomeModal && (
        <div className="tour-welcome-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative z-[10000]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('tour.welcome_question') || 'Do you already know the platform?'}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('tour.welcome_description') || 'Would you like to take a guided tour to get to know all the features of Artificiall?'}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={skipTour}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('tour.skip') || 'Skip'}
                </button>
                <button
                  onClick={startTour}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {t('tour.start_tour') || 'Take Tour'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tour Guiado */}
      <Joyride
        steps={steps}
        run={runTour}
        callback={handleJoyrideCallback}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        disableOverlayClose={true}
        disableScrolling={true}
        scrollToFirstStep={false}
        scrollOffset={120}
        styles={{
          options: {
            arrowColor: '#fff',
            backgroundColor: '#fff',
            primaryColor: '#2563eb',
            textColor: '#374151',
            zIndex: 10000,
            disableOverlay: false,
          },
        }}
        locale={{
          back: t('tour.back') || 'Back',
          close: t('tour.close') || 'Close',
          last: t('tour.last') || 'Finish',
          next: t('tour.next') || 'Next',
          open: t('tour.open') || 'Open',
          skip: t('tour.skip') || 'Skip',
        }}
      />
    </>
  );
}
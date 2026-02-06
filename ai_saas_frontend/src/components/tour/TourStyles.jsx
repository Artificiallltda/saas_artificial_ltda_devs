import { useEffect } from 'react';

export function injectTourStyles() {
  // Remove estilos anteriores se existirem
  const existingStyles = document.getElementById('tour-custom-styles');
  if (existingStyles) {
    existingStyles.remove();
  }

  // Cria e injeta novos estilos
  const style = document.createElement('style');
  style.id = 'tour-custom-styles';
  style.textContent = `
    /* Overlay com desfoque apenas no fundo */
    .react-joyride__overlay {
      background: rgba(0, 0, 0, 0.4) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    
    /* Spotlight limpo e nítido */
    .react-joyride__spotlight {
      border-radius: 8px !important;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4) !important;
      position: relative !important;
      z-index: 10001 !important;
    }
    
    /* Remove desfoque do elemento destacado */
    .react-joyride__spotlight * {
      filter: none !important;
      -webkit-filter: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    
    /* Tooltip melhorado */
    .react-joyride__tooltip {
      border-radius: 12px !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      background: rgba(255, 255, 255, 0.98) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      z-index: 10002 !important;
      position: relative !important;
      max-width: 280px !important;
      min-width: 200px !important;
    }
    
    /* Tooltip no mobile */
    @media (max-width: 1024px) {
      .react-joyride__tooltip {
        max-width: 90vw !important;
        min-width: 280px !important;
        font-size: 14px !important;
        left: 50% !important;
        right: auto !important;
        margin: 0 auto !important;
        transform: translateX(-50%) !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      .react-joyride__tooltip h4 {
        font-size: 16px !important;
        margin-bottom: 8px !important;
        line-height: 1.3 !important;
      }
      
      .react-joyride__tooltip p {
        font-size: 14px !important;
        line-height: 1.4 !important;
        margin-bottom: 16px !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      .react-joyride__tooltip button {
        font-size: 13px !important;
        padding: 8px 16px !important;
        white-space: nowrap !important;
      }
      
      /* Força todos os tooltips a aparecerem visíveis na tela */
      .react-joyride__tooltip[data-placement*="bottom"],
      .react-joyride__tooltip[data-placement*="right"] {
        top: auto !important;
        bottom: -200px !important; /* DE VOLTA PRA BAIXO DO TUDO (-200px) */
        left: 95% !important; /* MAIS PRA DIREITAAAAAAA */
        transform: translateX(-50%) !important;
        max-width: 45vw !important; /* MINÚSCULO PEQUENO */
        width: auto !important;
        position: fixed !important;
        margin: 0 !important;
        padding: 16px !important;
        z-index: 10002 !important;
        visibility: visible !important;
        display: block !important;
        opacity: 1 !important;
        background-color: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
      }
      
      /* Garante que o tooltip tenha espaço suficiente */
      .react-joyride__tooltip {
        top: auto !important;
        bottom: -200px !important; /* DE VOLTA PRA BAIXO DO TUDO (-200px) */
        left: 95% !important; /* MAIS PRA DIREITAAAAAAA */
        transform: translateX(-50%) !important;
        position: fixed !important;
        max-width: 45vw !important; /* MINÚSCULO PEQUENO */
        margin: 0 !important;
        padding: 16px !important;
        box-sizing: border-box !important;
        z-index: 10002 !important;
        visibility: visible !important;
        display: block !important;
        opacity: 1 !important;
        background-color: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
      }
      
      /* Especial para tooltips centralizados (welcome e conclusion) */
      .react-joyride__tooltip[data-placement*="center"] {
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        bottom: auto !important;
        max-width: 85vw !important;
        position: fixed !important;
        margin: 0 !important;
        padding: 20px !important;
        box-sizing: border-box !important;
      }
    }
    
    /* Botões estilizados */
    .react-joyride__tooltip button[data-action="primary"] {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
      border: none !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      transition: all 0.3s ease !important;
    }
    
    .react-joyride__tooltip button[data-action="primary"]:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
    }
    
    .react-joyride__tooltip button[data-action="secondary"],
    .react-joyride__tooltip button[data-action="skip"] {
      color: #6b7280 !important;
      background: transparent !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 6px !important;
      transition: all 0.3s ease !important;
    }
    
    .react-joyride__tooltip button[data-action="secondary"]:hover,
    .react-joyride__tooltip button[data-action="skip"]:hover {
      background: #f9fafb !important;
      border-color: #d1d5db !important;
    }
    
    /* Modal de boas-vindas com desfoque */
    .tour-welcome-overlay {
      background: rgba(0, 0, 0, 0.3) !important;
      backdrop-filter: blur(2px) !important;
      -webkit-backdrop-filter: blur(2px) !important;
    }
    
    /* Garante que elementos dentro do spotlight fiquem nítidos */
    body[data-joyride-overlay="true"] * {
      transition: filter 0.3s ease !important;
    }
    
    /* Remove desfoque de elementos específicos durante o tour */
    body[data-joyride-overlay="true"] .react-joyride__spotlight,
    body[data-joyride-overlay="true"] .react-joyride__spotlight *,
    body[data-joyride-overlay="true"] .react-joyride__tooltip,
    body[data-joyride-overlay="true"] .react-joyride__tooltip * {
      filter: none !important;
      -webkit-filter: none !important;
      z-index: inherit !important;
    }
    
    /* Animações suaves */
    @keyframes tourSlideIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .react-joyride__tooltip {
      animation: tourSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    /* Responsividade */
    @media (max-width: 640px) {
      .react-joyride__tooltip {
        max-width: 85vw !important;
        margin: 0 !important;
        padding: 16px !important;
      }
      
      .react-joyride__tooltip h4 {
        font-size: 16px !important;
      }
      
      .react-joyride__tooltip p {
        font-size: 14px !important;
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Cleanup function
  return () => {
    const styles = document.getElementById('tour-custom-styles');
    if (styles) {
      styles.remove();
    }
  };
}

export function useTourStyles() {
  useEffect(() => {
    const cleanup = injectTourStyles();
    return cleanup;
  }, []);
}
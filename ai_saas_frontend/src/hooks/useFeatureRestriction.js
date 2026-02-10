import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Definição das features disponíveis por plano
const PLAN_FEATURES = {
  'Pro': {
    text_generation: true,
    image_generation: true,
    video_generation: true,
    audio_generation: true,
    file_attachments: true,
    advanced_models: true,
    custom_temperature: true,
    high_resolution: true,
    download_bot: true
  },
  'Premium': {
    text_generation: true,
    image_generation: true,
    video_generation: false,
    audio_generation: true,
    file_attachments: true,
    advanced_models: true,
    custom_temperature: true,
    high_resolution: true,
    download_bot: true
  },
  'Bot': {
    text_generation: false,
    image_generation: false,
    video_generation: false,
    audio_generation: false,
    file_attachments: false,
    advanced_models: false,
    custom_temperature: false,
    high_resolution: false,
    download_bot: true
  },
  'Básico': {
    text_generation: true,
    image_generation: false,
    video_generation: false,
    audio_generation: false,
    file_attachments: false,
    advanced_models: false,
    custom_temperature: false,
    high_resolution: false,
    download_bot: true
  },
  'Grátis': {
    text_generation: true,
    image_generation: true,
    video_generation: false,
    audio_generation: false,
    file_attachments: false,
    advanced_models: false,
    custom_temperature: false,
    high_resolution: false,
    download_bot: false
  }
};

// Mapeamento de features para mensagens de upgrade
const FEATURE_MESSAGES = {
  text_generation: {
    title: 'upgrade_modal.text_generation.title',
    description: 'upgrade_modal.text_generation.description'
  },
  video_generation: {
    title: 'upgrade_modal.video_generation.title',
    description: 'upgrade_modal.video_generation.description'
  },
  image_generation: {
    title: 'upgrade_modal.image_generation.title',
    description: 'upgrade_modal.image_generation.description'
  },
  download_bot: {
    title: 'upgrade_modal.download_bot.title',
    description: 'upgrade_modal.download_bot.description'
  },
  audio_generation: {
    title: 'upgrade_modal.audio_generation.title',
    description: 'upgrade_modal.audio_generation.description'
  },
  file_attachments: {
    title: 'upgrade_modal.file_attachments.title',
    description: 'upgrade_modal.file_attachments.description'
  },
  advanced_models: {
    title: 'upgrade_modal.advanced_models.title',
    description: 'upgrade_modal.advanced_models.description'
  },
  custom_temperature: {
    title: 'upgrade_modal.custom_temperature.title',
    description: 'upgrade_modal.custom_temperature.description'
  },
  high_resolution: {
    title: 'upgrade_modal.high_resolution.title',
    description: 'upgrade_modal.high_resolution.description'
  }
};

// Nomes amigáveis das features para exibição
const FEATURE_DISPLAY_NAMES = {
  'text_generation': 'Geração de Texto',
  'image_generation': 'Geração de Imagem',
  'download_bot': 'Freepik/Envato Artificiall',
  'video_generation': 'Geração de Vídeo',
  'audio_generation': 'Geração de Áudio',
  'file_attachments': 'Anexos de Arquivos',
  'advanced_models': 'Modelos Avançados',
  'custom_temperature': 'Temperatura Personalizada',
  'high_resolution': 'Alta Resolução'
};

// Modelos disponíveis por plano
const PLAN_MODELS = {
  'Pro': [], // Todos os modelos disponíveis
  'Premium': [], // Todos os modelos exceto vídeo
  'Bot': [],
  'Básico': [
    'gpt-4o',
    'deepseek/deepseek-r1-0528:free',
    'sonar',
    'sonar-reasoning',
    'sonar-deep-research',
    'claude-haiku-4-5',
    'gemini-2.5-flash-lite'
  ],
  'Grátis': [
    'gpt-4o',
    'deepseek/deepseek-r1-0528:free',
    'claude-haiku-4-5'
  ]
};

export function useFeatureRestriction() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [upgradeModal, setUpgradeModal] = useState({
    isOpen: false,
    feature: null,
    title: '',
    description: ''
  });

  // Obter o nome do plano do usuário
  const userPlan = user?.plan?.name || 'Básico';

  // Verificar se o usuário tem acesso a uma feature
  const hasFeatureAccess = useCallback((feature) => {
    const features = PLAN_FEATURES[userPlan];
    return features?.[feature] || false;
  }, [userPlan]);

  // Verificar se o usuário tem acesso a um modelo específico
  const hasModelAccess = useCallback((model) => {
    // Se for plano Pro ou Premium, tem acesso a todos os modelos
    if (userPlan === 'Pro' || userPlan === 'Premium') {
      return true;
    }
    
    // Para plano Básico, verificar se o modelo está na lista permitida
    const allowedModels = PLAN_MODELS[userPlan] || [];
    return allowedModels.includes(model);
  }, [userPlan]);

  // Verificar acesso ao modelo e mostrar modal se necessário
  const checkModelAccess = useCallback((model) => {
    if (hasModelAccess(model)) {
      return true;
    }
    
    // Mostrar modal de upgrade para modelo não disponível
    setUpgradeModal({
      isOpen: true,
      feature: 'advanced_models',
      title: t('upgrade_modal.advanced_models.title'),
      description: t('upgrade_modal.basic_restriction', { 
        feature: 'Modelos Avançados' 
      })
    });
    return false;
  }, [hasModelAccess, t]);

  // Mostrar modal de upgrade para uma feature específica
  const showUpgradeModal = useCallback((feature, override = null) => {
    const featureInfo = FEATURE_MESSAGES[feature];
    
    if (!featureInfo) {
      console.error(`Feature ${feature} não encontrada nas mensagens de upgrade`);
      return;
    }

    // Mensagem personalizada baseada no plano atual
    let description = override?.description || t(featureInfo.description);
    
    if (!override?.description) {
      if (userPlan === 'Básico' && feature !== 'text_generation') {
        description = t('upgrade_modal.basic_restriction', { 
          feature: FEATURE_DISPLAY_NAMES[feature] || feature 
        });
      } else if (userPlan === 'Grátis' && feature !== 'text_generation') {
        description = t('upgrade_modal.free_restriction', { 
          feature: FEATURE_DISPLAY_NAMES[feature] || feature 
        });
      } else if (userPlan === 'Premium' && feature === 'video_generation') {
        description = t('upgrade_modal.premium_video_restriction');
      }
    }

    setUpgradeModal({
      isOpen: true,
      feature,
      title: override?.title || t(featureInfo.title),
      description
    });
  }, [userPlan, t]);

  // Fechar modal de upgrade
  const closeUpgradeModal = useCallback(() => {
    setUpgradeModal({
      isOpen: false,
      feature: null,
      title: '',
      description: ''
    });
  }, []);

  // Verificar acesso e mostrar modal se necessário
  const checkFeatureAccess = useCallback((feature) => {
    if (hasFeatureAccess(feature)) {
      return true;
    }
    
    showUpgradeModal(feature);
    return false;
  }, [hasFeatureAccess, showUpgradeModal]);

  // Obter features disponíveis para o plano do usuário
  const getAvailableFeatures = useCallback(() => {
    return PLAN_FEATURES[userPlan] || {};
  }, [userPlan]);

  return {
    hasFeatureAccess,
    checkFeatureAccess,
    hasModelAccess,
    checkModelAccess,
    showUpgradeModal,
    closeUpgradeModal,
    upgradeModal,
    getAvailableFeatures,
    userPlan
  };
}

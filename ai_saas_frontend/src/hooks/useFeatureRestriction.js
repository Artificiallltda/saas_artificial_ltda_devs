import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// -----------------------------
// Fonte da verdade (backend)
// -----------------------------
// O backend devolve `user.plan.features` como array:
// [{ key: "generate_text", value: "true" }, { key: "token_quota_monthly", value: "30000" }, ...]
// Aqui fazemos uma ponte entre os nomes "UI" (históricos do frontend) e as keys reais do backend.
const UI_FEATURE_TO_BACKEND_KEY = {
  text_generation: 'generate_text',
  image_generation: 'generate_image',
  video_generation: 'generate_video',
  file_attachments: 'attach_files',
  download_bot: 'download_bot',
  custom_temperature: 'customization',
};

function normalizeFeatureValue(raw) {
  if (raw == null) return { raw: null, enabled: false, numeric: null };
  const v = String(raw).trim().toLowerCase();

  if (v === 'true') return { raw, enabled: true, numeric: null };
  if (v === 'false') return { raw, enabled: false, numeric: null };

  const n = Number(v);
  if (Number.isFinite(n)) return { raw, enabled: n > 0, numeric: n };

  // fallback conservador: qualquer string não vazia (diferente de "false") habilita
  return { raw, enabled: Boolean(v), numeric: null };
}

function buildBackendFeatureMap(planFeatures) {
  const map = {};
  if (!Array.isArray(planFeatures)) return map;
  for (const pf of planFeatures) {
    const key = pf?.key;
    if (!key) continue;
    map[key] = normalizeFeatureValue(pf?.value);
  }
  return map;
}

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
    download_bot: false
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
  'Pro Empresa': [], // Todos os modelos disponíveis
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
  const backendFeatureMap = buildBackendFeatureMap(user?.plan?.features);

  const resolveBackendKey = useCallback((featureKey) => {
    // suporta tanto keys de UI (ex.: "text_generation") quanto keys reais do backend (ex.: "seo_keyword_research")
    return UI_FEATURE_TO_BACKEND_KEY[featureKey] || featureKey;
  }, []);

  // Verificar se o usuário tem acesso a uma feature
  const hasFeatureAccess = useCallback((feature) => {
    const backendKey = resolveBackendKey(feature);
    const backendValue = backendFeatureMap?.[backendKey];

    // Se o backend informou explicitamente a feature, usamos como fonte da verdade
    if (backendValue && typeof backendValue.enabled === 'boolean') {
      return backendValue.enabled;
    }

    // B2B fallback: se o usuário pertence a uma company, habilita o módulo Pro Empresa e colaboração básica
    // (o backend ainda valida permissões/feature flags efetivas por company owner).
    const hasCompany = Boolean(user?.company_id);
    if (
      hasCompany &&
      (backendKey === "pro_empresa" ||
        backendKey === "collab_workspaces" ||
        backendKey === "collab_approval_flow")
    ) {
      return true;
    }

    // Fallback (legacy): mantém comportamento por plano no frontend
    const features = PLAN_FEATURES[userPlan];
    return features?.[feature] || false;
  }, [backendFeatureMap, resolveBackendKey, user?.company_id, userPlan]);

  // Verificar se o usuário tem acesso a um modelo específico
  const hasModelAccess = useCallback((model) => {
    // Se for plano Pro ou Premium, tem acesso a todos os modelos
    if (userPlan === 'Pro' || userPlan === 'Premium' || userPlan === 'Pro Empresa') {
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

    // Fallback: se não existir copy dedicada, usa uma mensagem genérica (evita quebrar em features novas do Pro Empresa)
    const defaultTitle = override?.title || 'Recurso indisponível no seu plano';
    const defaultDescription =
      override?.description ||
      (userPlan === 'Básico'
        ? t('upgrade_modal.basic_restriction', { feature: FEATURE_DISPLAY_NAMES[feature] || feature })
        : userPlan === 'Grátis'
          ? t('upgrade_modal.free_restriction', { feature: FEATURE_DISPLAY_NAMES[feature] || feature })
        : 'Faça upgrade para liberar este recurso.');

    // Mensagem personalizada baseada no plano atual
    let description = featureInfo ? (override?.description || t(featureInfo.description)) : defaultDescription;
    
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
      title: featureInfo ? (override?.title || t(featureInfo.title)) : defaultTitle,
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
    // preferir backend, quando disponível
    if (user?.plan?.features?.length) {
      const m = {};
      for (const [k, v] of Object.entries(backendFeatureMap)) {
        m[k] = v?.raw;
      }
      return m;
    }
    return PLAN_FEATURES[userPlan] || {};
  }, [backendFeatureMap, user?.plan?.features?.length, userPlan]);

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

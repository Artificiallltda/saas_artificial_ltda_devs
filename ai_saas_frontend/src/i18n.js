import ptBR from "./i18n/pt-BR.json";
import enUS from "./i18n/en-US.json";

export const DEFAULT_LANGUAGE = "pt-BR";
export const LANGUAGE_STORAGE_KEY = "app_language";

export const dictionaries = {
  "pt-BR": ptBR,
  "en-US": enUS,
};

// Mapeia mensagens do backend para chaves de tradução
export const backendMessageKeyMap = {
  // Mensagens de erro comuns
  "Invalid username or password": "errors.invalid_credentials",
  "Invalid credentials": "errors.invalid_credentials",
  "Access restricted to the responsible administrator": "errors.admin_only",
  
  // Nomes de planos
  "Básico": "subscription.plan.basic",
  "Pro": "subscription.plan.pro",
  "Premium": "subscription.plan.premium",
  
  // Adicione mais mapeamentos conforme necessário
};


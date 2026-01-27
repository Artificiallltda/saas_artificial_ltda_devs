import ptBR from "./pt-BR.json";
import enUS from "./en-US.json";

export const DEFAULT_LANGUAGE = "pt-BR";
export const LANGUAGE_STORAGE_KEY = "language";

export const dictionaries = {
  "pt-BR": ptBR,
  "en-US": enUS
};

export const backendMessageKeyMap = {
  "Usuário ou senha inválidos": "errors.invalid_credentials",
  "Acesso restrito ao administrador responsável": "errors.admin_only",
  "Acesso restrito ao administrador responsável ": "errors.admin_only",
  "Básico": "subscription.plan.basic",
  "Geração com todos os modelos": "subscription.features.all_models",
  "Anexar arquivos": "subscription.features.attach_files",
  "Limite de chats": "subscription.features.chat_limit",
  "Limite de mensagens por chat": "subscription.features.messages_per_chat_limit",
  "Cota mensal de tokens por usuário": "subscription.features.monthly_tokens_quota_per_user",
  "Personalização das respostas (temperatura)": "subscription.features.temperature_customization",
  "Geração de imagem": "subscription.features.image_generation",
  "Geração de Imagem": "subscription.features.image_generation",
  "Geração de vídeo": "subscription.features.video_generation",
  "Geração de Vídeo": "subscription.features.video_generation",
  "Acesso ao Gemini 2.5 Pro": "subscription.features.gemini_2_5_pro",
  "Acesso ao Gemini 2.5 Flash": "subscription.features.gemini_2_5_flash",
  "Acesso ao Gemini 2.5 Flash Lite": "subscription.features.gemini_2_5_flash_lite",
  "Acesso ao Gemini 3.0": "subscription.features.gemini_3_0"
};

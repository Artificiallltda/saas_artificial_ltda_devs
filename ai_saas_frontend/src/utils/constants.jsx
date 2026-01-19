export const TEXT_MODELS = [
  { value: "gpt-4o", label: "GPT-4o", attachments: true, isGpt5: false },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", attachments: true, isGpt5: true },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", attachments: true, isGpt5: true },
  { value: "o1", label: "O1", attachments: true, isGpt5: true },
  { value: "o1-mini", label: "O1 Mini", attachments: true, isGpt5: true },
  { value: "o3", label: "O3", attachments: true, isGpt5: true },
  { value: "o3-mini", label: "O3 Mini", attachments: true, isGpt5: true },
  { value: "o4-mini", label: "O4 Mini", attachments: true, isGpt5: true },
  { value: "gpt-4.1", label: "GPT-4.1", attachments: true, isGpt5: true },
  { value: "gpt-5", label: "GPT-5", attachments: true, isGpt5: true },
  { value: "gpt-5-mini", label: "GPT-5 Mini", attachments: true, isGpt5: true },
  { value: "gpt-5.1", label: "GPT-5.1", attachments: true, isGpt5: true },
  { value: "gpt-5.2", label: "GPT-5.2", attachments: true, isGpt5: true },
  { value: "gpt-5-nano", label: "GPT-5 Nano", attachments: true, isGpt5: true },
  { value: "sonar", label: "Sonar", attachments: false },
  { value: "sonar-reasoning", label: "Sonar Reasoning", attachments: false },
  { value: "sonar-reasoning-pro", label: "Sonar Reasoning Pro", attachments: false },
  { value: "sonar-deep-research", label: "Sonar Deep Research", attachments: false },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", attachments: false },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", attachments: false },
  { value: "claude-opus-4-5", label: "Claude Opus 4.5", attachments: false },
  { value: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1 0528", attachments: false, isGpt5: false },
  { value: "gemini-3-pro-preview", label: "Gemini 3.0", attachments: true, requiredFeature: "gemini_30" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", attachments: true, requiredFeature: "gemini_25_pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", attachments: true, requiredFeature: "gemini_25_flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", attachments: true, requiredFeature: "gemini_25_flash_lite" },
];

export const IMAGE_MODELS = [
  { value: "gpt-image-1", label: "GPT Image 1" },
  { value: "dall-e-2", label: "DALL·E 2" },
  { value: "dall-e-3", label: "DALL·E 3" },
  { value: "imagen-4.0-generate-001", label: "Gemini Imagen 4.0" },
  { value: "imagen-4.0-ultra-generate-001", label: "Gemini Imagen 4.0 Ultra" },
  { value: "imagen-4.0-fast-generate-001", label: "Gemini Imagen 4.0 Fast" },
  { value: "imagen-3.0-generate-002", label: "Gemini Imagen 3.0" },
 // { value: "midjourney", label: "Midjourney" },
  //{ value: "stable-diffusion", label: "Stable Diffusion" },
  //{ value: "adobe-firefly", label: "Adobe Firefly" },
];

export const VIDEO_MODELS = [
  { value: "veo-3.0-generate-001", label: "Gemini Veo 3.0" },
  { value: "veo-3.0-fast-generate-001", label: "Gemini Veo 3.0 Fast" },
  { value: "veo-2.0-generate-001", label: "Gemini Veo 2.0" },
];

export const IMAGE_STYLES = [
  { value: "auto", label: "Automático" },
  { value: "realist", label: "Fotorrealista" },
  { value: "artist", label: "Artístico" },
  { value: "cartoon", label: "Cartoon" },
  { value: "abstract", label: "Abstrato" },
  { value: "digital", label: "Arte Digital" },
];

export const IMAGE_RATIOS = [
  { value: "1024x1024", label: "Quadrado" },
  { value: "1536x1024", label: "Paisagem" },
  { value: "1024x1536", label: "Retrato" },
];

export const VIDEO_RATIOS = [
  { value: "16:9", label: "Paisagem (16:9)" },
  { value: "9:16", label: "Retrato (9:16)" },
];

export const IMAGE_QUALITIES = [
  { value: "auto", label: "Automático" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

export const TAB_TYPES = [
  { value: "text", label: "Textos" },
  { value: "image", label: "Imagens" },
  { value: "video", label: "Vídeos" },
];
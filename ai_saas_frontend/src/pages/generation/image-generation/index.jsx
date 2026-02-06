import { useState, useRef, useEffect } from 'react';
import styles from './image.module.css';
import Layout from "../../../components/layout/Layout";
import CustomSelect from "../../../components/common/CustomSelect";
import { Download, Send, Loader2, Image as ImageIcon, Settings, ChevronDown, X, Paperclip } from 'lucide-react';
import { toast } from 'react-toastify';
import { aiRoutes, generatedContentRoutes } from '../../../services/apiRoutes';
import { apiFetch } from '../../../services/apiService';
import { IMAGE_MODELS, IMAGE_STYLES, IMAGE_RATIOS } from '../../../utils/constants';
import { useLanguage } from '../../../context/LanguageContext';
import { useFeatureRestriction } from '../../../hooks/useFeatureRestriction';
import UpgradeModal from '../../../components/common/UpgradeModal';

function ImageGeneration() {
  const { t } = useLanguage();
  const { checkFeatureAccess, upgradeModal, closeUpgradeModal } = useFeatureRestriction();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-image-1");
  const [style, setStyle] = useState("auto");
  const [ratio, setRatio] = useState("1024x1024");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const fileInputRef = useRef(null);
  const settingsRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: t('generation.image.assistant.greeting')
    }
  ]);

  // Update assistant message when language changes
  useEffect(() => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: t('generation.image.assistant.greeting')
      }
    ]);
  }, [t]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('generation.common.reference_image.invalid_type'));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(t('generation.common.reference_image.invalid_size'));
      return;
    }

    setReferenceImage(file);
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    // Verificar se o usuário tem acesso à geração de imagem
    if (!checkFeatureAccess('image_generation')) {
      return;
    }

    if (!prompt.trim() && !referenceImage) {
      toast.warning(t('generation.common.prompt_required'));
      return;
    }

    // Mensagem do usuário (mostra a imagem anexada como preview)
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: prompt,
      ...(referenceImage ? { image: URL.createObjectURL(referenceImage) } : {}),
    };
    setMessages(prev => [...prev, userMessage]);

    setLoading(true);
    setGeneratedImage(null);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('model', model);
      formData.append('style', style);
      formData.append('ratio', ratio);
      if (referenceImage) {
        formData.append('reference_image', referenceImage);
      }

      const res = await apiFetch(aiRoutes.generateImage, {
        method: "POST",
        body: formData,
      });

      if (res.content?.id) {
        const imgRes = await apiFetch(generatedContentRoutes.getImage(res.content.id), { method: "GET" });
        const blob = await imgRes.blob();
        const imageUrl = URL.createObjectURL(blob);
        setGeneratedImage(imageUrl);

        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: '',
          image: imageUrl
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      toast.success(t('generation.image.success_toast'));
      setPrompt('');
      setReferenceImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      toast.error(t('generation.image.error_toast'));
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: t('generation.image.error_message')
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    fetch(generatedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        const filename = `Artificiall Image - ${new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", "_")
          .replace(/:/g, "-")}.png`;
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error(t('generation.image.download_error')));
  };

  return (
    <Layout>
      <section className="flex flex-col h-[calc(100vh-80px)] bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">{t('generation.image.title')}</h1>
          <p className="text-sm text-gray-500">{t('generation.image.subtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                {message.image && (
                  <div className="mt-2">
                    <img 
                      src={message.image} 
                      alt={message.role === 'user' ? t('generation.common.reference_image.label') : t('generation.image.generated_alt')} 
                      className="max-h-96 rounded-lg shadow-md" 
                    />
                    {message.role !== 'user' && (
                      <button
                        onClick={() => {
                          fetch(message.image)
                            .then((res) => res.blob())
                            .then((blob) => {
                              const a = document.createElement("a");
                              const filename = `Artificiall-Image-${Date.now()}.png`;
                              a.href = URL.createObjectURL(blob);
                              a.download = filename;
                              a.click();
                              URL.revokeObjectURL(a.href);
                            })
                            .catch(() => toast.error(t('generation.image.download_error')));
                        }}
                        className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Download className="w-4 h-4" />
                        {t('generation.image.download')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 p-3 text-gray-500">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 bg-white relative">
          {referenceImage && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded-lg max-w-[calc(100%-200px)]">
              <img 
                src={URL.createObjectURL(referenceImage)} 
                alt={t('generation.common.reference_image.alt')} 
                className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{t('generation.common.reference_image.label')}</p>
                <p className="text-xs text-gray-500 truncate">{referenceImage.name}</p>
              </div>
              <button
                onClick={removeReferenceImage}
                className="p-1 text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                title={t('generation.common.reference_image.remove')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="relative">
            <div className="absolute right-4 -top-14 z-10" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Settings className="w-4 h-4" />
                {t('generation.common.settings')}
                <ChevronDown className={`w-4 h-4 transition-transform ${showSettings ? 'transform rotate-180' : ''}`} />
              </button>
              
              {showSettings && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('generation.common.fields.model')}</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {IMAGE_MODELS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('generation.common.fields.style')}</label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {IMAGE_STYLES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {t(`generation.image.styles.${s.value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('generation.common.fields.ratio')}</label>
                    <select
                      value={ratio}
                      onChange={(e) => setRatio(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {IMAGE_RATIOS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {t(`generation.image.ratios.${r.value === '1024x1024' ? 'square' : r.value === '1536x1024' ? 'landscape' : 'portrait'}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl hover:bg-gray-100 transition shadow flex items-center justify-center -mt-1"
                title={t('generation.common.reference_image.attach')}
              >
                <Paperclip className="w-5 h-5 text-gray-600" />
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
              />
              
              <div className="flex-1 relative">
                <textarea
                  placeholder={t('generation.image.prompt_placeholder')}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !loading && (prompt.trim() || referenceImage)) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  rows={1}
                  className="w-full px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  <span className="text-xs text-gray-400">{prompt.length}/1000</span>
                </div>
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={loading || (!prompt.trim() && !referenceImage)}
                className={`p-3 rounded-xl ${
                  loading || (!prompt.trim() && !referenceImage)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } transition-colors`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={closeUpgradeModal}
        title={upgradeModal.title}
        description={upgradeModal.description}
        feature={upgradeModal.feature}
      />
    </Layout>
  );
}

export default ImageGeneration;
import { useState, useRef, useEffect } from 'react';
import styles from './video.module.css';
import Layout from "../../../components/layout/Layout";
import { Download, Send, Loader2, Video as VideoIcon, Settings, ChevronDown, X, Paperclip } from 'lucide-react';
import { toast } from 'react-toastify';
import { aiRoutes, generatedContentRoutes, userRoutes } from '../../../services/apiRoutes';
import { apiFetch } from '../../../services/apiService';
import { VIDEO_MODELS, VIDEO_RATIOS } from '../../../utils/constants';
import { useLanguage } from '../../../context/LanguageContext';

function VideoGeneration() {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("veo-3.0-fast-generate-001");
  const [ratio, setRatio] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const fileInputRef = useRef(null);
  const settingsRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      contentKey: 'generation.video.assistant.greeting'
    }
  ]);

  // Fechar o dropdown de configurações ao clicar fora
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('generation.common.reference_image.invalid_type'));
      return;
    }

    // Validate file size (max 5MB)
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
    if (!prompt.trim() && !referenceImage) {
      toast.warning("Digite um prompt ou anexe uma imagem de referência!");
      return;
    }

    // Adiciona a mensagem do usuário ao chat
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: prompt,
      ...(referenceImage ? { image: URL.createObjectURL(referenceImage) } : {}),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setGeneratedVideo(null);

    try {
      const userData = await apiFetch(userRoutes.getCurrentUser(), { method: "GET" });
      const userPlan = userData?.plan?.name || "Básico";

      if (userPlan !== "Pro") {
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          contentKey: 'generation.video.pro_only'
        };
        setMessages(prev => [...prev, errorMessage]);
        toast.error(t('generation.video.pro_only'));
        return;
      }

      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('model_used', model);
      formData.append('ratio', ratio);
      
      if (referenceImage) {
        formData.append('reference_image', referenceImage);
      }

      const res = await apiFetch(aiRoutes.generateVideo, {
        method: "POST",
        body: formData,
      });

      if (res?.video?.id) {
        const videoRes = await apiFetch(generatedContentRoutes.getVideo(res.video.id), {
          method: "GET",
        });
        const blob = await videoRes.blob();
        const videoUrl = URL.createObjectURL(blob);
        setGeneratedVideo(videoUrl);
        
        // Adiciona o vídeo gerado ao chat
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          contentKey: 'generation.video.success_message',
          video: videoUrl
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      toast.success(t('generation.video.success_toast'));
      setPrompt(''); // Limpa o input após o envio
      setReferenceImage(null); // Limpa a imagem de referência
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      toast.error(t('generation.video.error_toast'));
      
      // Adiciona mensagem de erro ao chat
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        contentKey: 'generation.video.error_message'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideo) return;

    fetch(generatedVideo)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        const filename = `Artificiall Video - ${new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", "_")
          .replace(/:/g, "-")}.mp4`;
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error(t('generation.video.download_error')));
  };

  const getRatioLabel = (value) => {
    const ratioKeyByValue = {
      "16:9": "generation.video.ratios.landscape",
      "9:16": "generation.video.ratios.portrait"
    };
    const key = ratioKeyByValue[value];
    if (!key) return value;
    return t(key);
  };

  return (
    <Layout>
      <section className="flex flex-col h-[calc(100vh-80px)] bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">{t('generation.video.title')}</h1>
          <p className="text-sm text-gray-500">{t('generation.video.subtitle')}</p>
        </div>

        {/* Chat Area */}
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
                      alt="Imagem enviada" 
                      className="max-h-48 rounded-lg shadow-md" 
                    />
                  </div>
                )}
                {message.video && (
                  <div className="mt-2">
                    <video 
                      src={message.video} 
                      controls 
                      className="max-h-96 rounded-lg shadow-md"
                    />
                    <button
                      onClick={() => {
                        fetch(message.video)
                          .then((res) => res.blob())
                          .then((blob) => {
                            const a = document.createElement("a");
                            const filename = `Artificiall-Video-${Date.now()}.mp4`;
                            a.href = URL.createObjectURL(blob);
                            a.download = filename;
                            a.click();
                            URL.revokeObjectURL(a.href);
                          })
                          .catch(() => toast.error(t('generation.video.download_error')));
                      }}
                      className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Download className="w-4 h-4" />
                      {t('generation.video.download')}
                    </button>
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

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white relative">
          {/* Reference Image Preview */}
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
            {/* Settings Dropdown */}
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
                      {VIDEO_MODELS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
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
                      {VIDEO_RATIOS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {getRatioLabel(r.value)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Clip Icon */}
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
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
                  placeholder={t('generation.video.prompt_placeholder')}
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
    </Layout>
  );
}

export default VideoGeneration;
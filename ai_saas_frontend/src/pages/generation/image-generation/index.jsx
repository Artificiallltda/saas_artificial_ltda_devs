import { useState, useRef, useEffect } from 'react';
import styles from './image.module.css';
import Layout from "../../../components/layout/Layout";
import CustomSelect from "../../../components/common/CustomSelect";
import { Download, Send, Loader2, Image as ImageIcon, Settings, ChevronDown, X, Paperclip } from 'lucide-react';
import { toast } from 'react-toastify';
import { aiRoutes, generatedContentRoutes } from '../../../services/apiRoutes';
import { apiFetch } from '../../../services/apiService';
import { IMAGE_MODELS, IMAGE_STYLES, IMAGE_RATIOS } from '../../../utils/constants';

function ImageGeneration() {
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
      content: 'Olá! Sou o assistente de geração de imagens. Descreva a imagem que você gostaria de criar.'
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
      toast.error('❌ Apenas imagens (.png, .jpg, .jpeg, .webp) são permitidas como referência.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('❌ A imagem deve ter no máximo 5MB.');
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
    if (!prompt.trim()) {
      toast.warning("Digite um prompt antes de gerar!");
      return;
    }

    // Adiciona a mensagem do usuário ao chat
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: prompt
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
        const imgRes = await apiFetch(generatedContentRoutes.getImage(res.content.id), {
          method: "GET",
        });
        const blob = await imgRes.blob();
        const imageUrl = URL.createObjectURL(blob);
        setGeneratedImage(imageUrl);
        
        // Adiciona a imagem gerada ao chat
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: '',
          image: imageUrl
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      toast.success("Imagem gerada com sucesso!");
      setPrompt(''); // Limpa o input após o envio
      setReferenceImage(null); // Limpa a imagem de referência
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar imagem!");
      
      // Adiciona mensagem de erro ao chat
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao gerar a imagem. Por favor, tente novamente.'
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
      .catch(() => toast.error("Falha ao baixar a imagem"));
  };

  return (
    <Layout>
      <section className="flex flex-col h-[calc(100vh-80px)] bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">Geração de Imagem</h1>
          <p className="text-sm text-gray-500">Crie imagens incríveis usando IA generativa</p>
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
                      alt="Gerada pela IA" 
                      className="max-h-96 rounded-lg shadow-md" 
                    />
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
                          .catch(() => toast.error("Falha ao baixar a imagem"));
                      }}
                      className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Download className="w-4 h-4" />
                      Baixar imagem
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
                alt="Referência" 
                className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">Imagem de referência</p>
                <p className="text-xs text-gray-500 truncate">{referenceImage.name}</p>
              </div>
              <button
                onClick={removeReferenceImage}
                className="p-1 text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                title="Remover imagem"
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
                Configurações
                <ChevronDown className={`w-4 h-4 transition-transform ${showSettings ? 'transform rotate-180' : ''}`} />
              </button>
              
              {showSettings && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estilo</label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {IMAGE_STYLES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proporção</label>
                    <select
                      value={ratio}
                      onChange={(e) => setRatio(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {IMAGE_RATIOS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
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
                title="Anexar imagem de referência"
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
                  placeholder="Descreva a imagem que você gostaria de gerar..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !loading) {
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
                disabled={loading || !prompt.trim()}
                className={`p-3 rounded-xl ${
                  loading || !prompt.trim()
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

export default ImageGeneration;
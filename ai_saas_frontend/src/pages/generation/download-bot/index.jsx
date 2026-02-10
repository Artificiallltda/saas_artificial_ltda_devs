import { useState, useEffect, useRef } from 'react';
import Layout from "../../../components/layout/Layout";
import { Send, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { downloadRoutes } from '../../../services/apiRoutes';
import { apiFetch } from '../../../services/apiService';
import { useLanguage } from '../../../context/LanguageContext';
import { useFeatureRestriction } from '../../../hooks/useFeatureRestriction';
import UpgradeModal from '../../../components/common/UpgradeModal';

function DownloadBot() {
  const { t } = useLanguage();
  const { checkFeatureAccess, upgradeModal, closeUpgradeModal } = useFeatureRestriction();
  const [messages, setMessages] = useState([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    freepik: null,
    envato: null,
    drive: null,
    ready: false
  });
  const messagesEndRef = useRef(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Verificar status das conexões ao carregar
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      if (!checkFeatureAccess('download_bot')) {
        setCheckingStatus(false);
        return;
      }
      const data = await apiFetch(downloadRoutes.status, {
        method: "GET"
      });

      if (data.status === "online") {
        // Verificar status das conexões (se o backend retornar)
        const freepikStatus = data.freepik !== undefined ? data.freepik : true;
        const envatoStatus = data.envato !== undefined ? data.envato : true;
        const driveStatus = data.drive !== undefined ? data.drive : true;
        const isReady = freepikStatus && envatoStatus && driveStatus;

        setStatus({
          freepik: freepikStatus,
          envato: envatoStatus,
          drive: driveStatus,
          ready: isReady
        });

        // Mensagem inicial do bot com status das conexões
        setMessages([{
          id: 1,
          role: 'bot',
          content: isReady 
            ? t('generation.download.bot.ready')
            : t('generation.download.bot.checking'),
          status: {
            freepik: freepikStatus,
            envato: envatoStatus,
            drive: driveStatus
          }
        }]);
      }
    } catch (err) {
      console.error('Error checking status:', err);
      // Em caso de erro, assumir que está offline
      setStatus({
        freepik: false,
        envato: false,
        drive: false,
        ready: false
      });
      
      setMessages([{
        id: 1,
        role: 'bot',
        content: t('generation.download.bot.error_connection'),
        status: {
          freepik: false,
          envato: false,
          drive: false
        }
      }]);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!checkFeatureAccess('download_bot')) {
      return;
    }

    if (!url.trim()) {
      toast.warning(t('generation.download.error.url_required'));
      return;
    }

    // Validar se é uma URL válida do Freepik ou Envato
    const isValidUrl = url.includes('freepik.com') || url.includes('envato.com');
    if (!isValidUrl) {
      toast.warning(t('generation.download.error.invalid_url'));
      return;
    }

    // Adicionar mensagem do usuário
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: url
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setUrl("");

    // Mensagem de processamento do bot
    const processingMessage = {
      id: Date.now() + 1,
      role: 'bot',
      content: t('generation.download.bot.processing'),
      loading: true
    };
    setMessages(prev => [...prev, processingMessage]);

    try {
      const data = await apiFetch(downloadRoutes.process, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (data.success && data.drive_link) {
        // Remover mensagem de loading e adicionar resposta
        setMessages(prev => {
          const filtered = prev.filter(msg => !msg.loading);
          return [...filtered, {
            id: Date.now() + 2,
            role: 'bot',
            content: t('generation.download.bot.success'),
            driveLink: data.drive_link
          }];
        });
        toast.success(t('generation.download.success'));
      } else {
        throw new Error(data.error || t('generation.download.error.processing'));
      }
    } catch (err) {
      // Remover mensagem de loading e adicionar erro
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.loading);
        return [...filtered, {
          id: Date.now() + 2,
          role: 'bot',
          content: t('generation.download.bot.error'),
          error: true
        }];
      });
      toast.error(err.message || t('generation.download.error.processing'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col w-full h-[calc(100vh-80px)] bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('generation.download.title')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('generation.download.subtitle')}
          </p>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {checkingStatus && (
              <div className="flex items-center justify-center py-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md w-full">
                  <div className="flex items-start gap-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-blue-900 font-semibold mb-2">
                        {t('generation.download.connecting.title')}
                      </h3>
                      <p className="text-blue-700 text-sm leading-relaxed">
                        {t('generation.download.connecting.message')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.error
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                  }`}
                >
                  {message.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{message.content}</span>
                    </div>
                  ) : message.status ? (
                    <div className="space-y-2">
                      <p className="font-medium mb-3">{message.content}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          {message.status.freepik ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>
                            {t('generation.download.status.freepik')}:{' '}
                            {message.status.freepik
                              ? t('generation.download.status.connected')
                              : t('generation.download.status.disconnected')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {message.status.envato ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>
                            {t('generation.download.status.envato')}:{' '}
                            {message.status.envato
                              ? t('generation.download.status.connected')
                              : t('generation.download.status.disconnected')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {message.status.drive ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>
                            {t('generation.download.status.drive')}:{' '}
                            {message.status.drive
                              ? t('generation.download.status.connected')
                              : t('generation.download.status.disconnected')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : message.driveLink ? (
                    <div className="space-y-2">
                      <p>{message.content}</p>
                      <a
                        href={message.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 underline font-medium"
                      >
                        <span>{t('generation.download.open_drive')}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('generation.download.input.placeholder')}
                disabled={loading || checkingStatus || !status.ready}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={loading || checkingStatus || !status.ready || !url.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{t('generation.download.send')}</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('generation.download.input.hint')}
            </p>
          </form>
        </div>
      </div>
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

export default DownloadBot;


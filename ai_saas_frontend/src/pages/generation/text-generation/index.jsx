import { useState, useRef, useEffect } from 'react';
import Layout from "../../../components/layout/Layout";
import { Send, Loader2, Settings, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { aiRoutes } from '../../../services/apiRoutes';
import { apiFetch } from '../../../services/apiService';
import { TEXT_MODELS } from '../../../utils/constants';
import Sidebar from "../components/chat/Sidebar";
import useChats from "../hooks/useChats";

function TextGeneration() {
  const { chats, chatId, messages, setMessages, chatVisible, chatIdSetter, loadChat, createNewChat, updateChatList } = useChats();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const settingsRef = useRef(null);

  // Inicializar mensagens se não houver
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 1,
        role: 'assistant',
        content: 'Olá! Sou o assistente de geração de texto. Como posso ajudar você hoje?'
      }]);
    }
  }, []);

  // Função para alternar a visibilidade da barra lateral
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', newState);
      return newState;
    });
  };

  // Inicializar estado da sidebar a partir do localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
    
    window.toggleChatSidebar = () => {
      if (window.innerWidth < 1024) {
        setMobileSidebarOpen(prev => !prev);
      } else {
        setSidebarCollapsed(prev => {
          const newState = !prev;
          localStorage.setItem('sidebarCollapsed', newState);
          return newState;
        });
      }
    };

    window.closeChatSidebar = () => setMobileSidebarOpen(false);
    
    return () => {
      delete window.toggleChatSidebar;
      delete window.closeChatSidebar;
    };
  }, []);

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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.warning("Digite um prompt antes de gerar!");
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: prompt
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    // Chamada real ao backend (substitui o bloco de simulação)
    try {
      const aiData = await apiFetch(aiRoutes.generateText, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: prompt,
          chat_id: chatId,
          model,
          temperature,
        }),
      });

      if (aiData.error) throw new Error(aiData.error);

      chatIdSetter?.(aiData.chat_id);

      updateChatList?.(
        {
          id: aiData.chat_id,
          title: aiData.chat_title || "Novo Chat",
          archived: false,
          created_at: aiData.created_at || new Date().toISOString(),
          snippet: aiData.messages?.slice(-1)[0]?.content || "",
        },
        "add"
      );

      const lastMsg = aiData.messages?.slice(-1)[0];
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: lastMsg?.content || aiData.generated_text || "",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      toast.success("Texto gerado com sucesso!");
      setPrompt("");
    } catch (err) {
      toast.error(err.message || "Erro ao gerar resposta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className={`flex w-full h-[calc(100vh-80px)] overflow-hidden font-inter ${mobileSidebarOpen ? 'bg-white md:bg-gray-50' : 'bg-gray-50'}`}>
        {/* Sidebar */}
        <div className={`
          w-64 opacity-100
          ${sidebarCollapsed ? "md:w-0 md:opacity-0" : "md:w-64 md:opacity-100"}
          fixed md:relative left-0 top-[80px] md:top-0 h-[calc(100vh-80px)] md:h-full transition-all duration-300 z-40 md:z-40 bg-white border-r border-gray-200 flex flex-col overflow-y-auto overflow-x-hidden
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        data-chat-sidebar=""
        >
          <Sidebar
            chats={chats}
            chatId={chatId}
            loadChat={(id) => {
              loadChat(id);
              setMobileSidebarOpen(false);
            }}
            createNewChat={() => {
              createNewChat();
              setMobileSidebarOpen(false);
            }}
            updateChatList={updateChatList}
            setImagesOpen={() => {}} // Não faz nada na geração de texto
            isCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content */}
        <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-0' : 'md:ml-0'
        }`}>
          <div className="flex-1 flex flex-col h-full">
            <section className="flex flex-col h-full bg-white">
              {/* Header com Botão de Toggle */}
              <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Geração de Texto</h1>
                  <p className="text-sm text-gray-500">Crie textos incríveis usando IA generativa</p>
                </div>
                
                <div className="flex items-center gap-3">
                </div>
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
              <div className="border-t border-gray-200 p-4 bg-white relative flex-shrink-0">
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
                            {TEXT_MODELS.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0 (preciso)</span>
                            <span>{temperature}</span>
                            <span>1 (criativo)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        placeholder="Descreva o texto que você gostaria de gerar..."
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
          </div>
        </div>

        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div 
            className="fixed left-0 right-0 bottom-0 top-[80px] bg-transparent z-30 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </div>
    </Layout>
  );
}

export default TextGeneration;
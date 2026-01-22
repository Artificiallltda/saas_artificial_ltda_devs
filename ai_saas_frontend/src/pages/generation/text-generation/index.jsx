import { useState, useEffect } from "react";
import Layout from "../../../components/layout/Layout";
import MessageListVirtualized from "../components/chat/MessageListVirtualized";
import ChatInput from "../components/chat/ChatInput";
import ChatControls from "../components/controls/ChatControls";
import Sidebar from "../components/chat/Sidebar";
import { TEXT_MODELS } from "../../../utils/constants";
import { toast } from "react-toastify";
import useChats from "../hooks/useChats";
import useChatActions from "../hooks/useChatActions";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import GeneratedFiles from "../components/chat/GeneratedFiles";

function TextGeneration() {
  const { user } = useAuth();
  const { chats, chatId, messages, setMessages, chatVisible, chatIdSetter, loadChat, createNewChat, updateChatList } = useChats();
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [files, setFiles] = useState([]);
  // Estado da barra lateral - true = colapsada (invisível), false = expandida (visível)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mainSidebarCollapsed, setMainSidebarCollapsed] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Função para alternar a visibilidade da barra lateral
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      // Opcional: Salvar preferência no localStorage
      localStorage.setItem('sidebarCollapsed', newState);
      return newState;
    });
  };

  const isTemperatureLocked = model.startsWith("o") || model.startsWith("gpt-5");
  const currentModelObj = TEXT_MODELS.find((m) => m.value === model);
  const attachmentsAllowed = currentModelObj?.attachments ?? true;

  const { loading, handleSend, handleStop } = useChatActions({
    chatId,
    setChatId: chatIdSetter,
    messages,
    setMessages,
    updateChatList,
  });

  useEffect(() => {
    if (user) {
      if (user.plan?.name === "Pro") {
      }
    }
  }, [user]);

  useEffect(() => {
    if (!attachmentsAllowed && files.length > 0) {
      toast.warning("Arquivos removidos pois este modelo não permite anexos.");
      setFiles([]);
    }
  }, [attachmentsAllowed]);

  // Inicializar estado da sidebar a partir do localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
    
    // Registrar função global para controle da sidebar
    window.toggleChatSidebar = () => {
      setSidebarCollapsed(prev => {
        const newState = !prev;
        localStorage.setItem('sidebarCollapsed', newState);
        return newState;
      });
    };
    
    return () => {
      delete window.toggleChatSidebar;
    };
  }, []);

  return (
    <Layout mainSidebarCollapsed={mainSidebarCollapsed}>
      <div className="flex w-full h-screen overflow-hidden bg-gray-50 font-inter">
        {/* Botão de Alternar Sidebar - Integrado ao Header */}
        <div 
          className={`fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center px-4 transition-all duration-300 ${
            sidebarCollapsed ? 'pl-4' : 'pl-72'
          }`}
        >
          <button
            onClick={toggleSidebar}
            className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-100 transition-all duration-200 flex items-center justify-center"
            style={{
              width: '36px',
              height: '36px',
            }}
            title={sidebarCollapsed ? "Mostrar barra lateral" : "Ocultar barra lateral"}
          >
          {sidebarCollapsed ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition"
          aria-label="Abrir menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        </div>

        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          ${sidebarCollapsed ? "w-0 opacity-0" : "w-64 opacity-100"}
          fixed md:relative top-0 left-0 h-screen transition-all duration-300 z-40 bg-white border-r border-gray-200 flex flex-col overflow-y-auto
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
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
            setImagesOpen={setImagesOpen}
            isCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content */}
        <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        } pt-16`}>
          <div className="flex-1 flex flex-col h-full">
            {imagesOpen ? (
              <GeneratedFiles
                open={imagesOpen}
                onClose={() => setImagesOpen(false)}
              />
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-full max-w-2xl mx-auto px-4">
                  <h1 className="text-4xl font-bold text-gray-800 mb-6">
                    Olá, como posso ajudar hoje?
                  </h1>
                  <p className="text-gray-500 text-lg">
                    Escolha diferentes modelos e teste novas ideias
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="w-full max-w-3xl mx-auto px-4 py-6">
                  <MessageListVirtualized
                    messages={messages}
                    height={window.innerHeight - 200}
                    width="100%"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {!imagesOpen && (
              <div className="w-full border-t border-gray-100 bg-white">
                <div className="w-full px-4">
                  <div className="w-full">
                    <ChatInput
                      input={input}
                      setInput={setInput}
                      handleSend={() => {
                        handleSend({ input, files, model, temperature, isTemperatureLocked });
                        setInput("");
                        setFiles([]);
                      }}
                      handleStop={handleStop}
                      loading={loading}
                      files={files}
                      setFiles={setFiles}
                      attachmentsAllowed={attachmentsAllowed}
                    />
                    <div className="px-4 pb-4">
                      <div className="max-w-3xl mx-auto px-4 pb-4">
                        <ChatControls
                          model={model}
                          setModel={setModel}
                          temperature={temperature}
                          setTemperature={setTemperature}
                          isTemperatureLocked={isTemperatureLocked}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default TextGeneration;

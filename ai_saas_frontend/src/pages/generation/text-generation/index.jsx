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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mainSidebarCollapsed, setMainSidebarCollapsed] = useState(true);
  const [imagesOpen, setImagesOpen] = useState(false);

  const isTemperatureLocked = model.startsWith("o") || model.startsWith("gpt-5");
  const currentModelObj = TEXT_MODELS.find((m) => m.value === model);
  const attachmentsAllowed = currentModelObj?.attachments ?? true;

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

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

  return (
    <Layout mainSidebarCollapsed={mainSidebarCollapsed}>
      <div className="flex w-full h-[calc(100vh-120px)] overflow-hidden bg-gray-50 font-inter">
        <div className={`absolute top-0 left-0 h-full transition-all duration-300 z-40 ${sidebarCollapsed ? "-ml-72" : "ml-0"}`}>
          <Sidebar
            chats={chats}
            chatId={chatId}
            loadChat={loadChat}
            createNewChat={createNewChat}
            updateChatList={updateChatList}
            setImagesOpen={setImagesOpen}
          />
        </div>

        {/* Botão existente reposicionado como overlay fixo para não empurrar o conteúdo */}
        <button
          onClick={() => {
            setMainSidebarCollapsed((prev) => !prev);
            toggleSidebar();
          }}
          className={`
            group
            fixed top-[60%] ${sidebarCollapsed ? "left-0" : "left-72"} z-40
            h-16 w-10 min-w-[44px]
            flex items-center justify-center
            rounded-r-xl shadow-md
            transition-all duration-500 ease-out
            ${sidebarCollapsed
              ? "bg-white border border-gray-300 hover:bg-gray-100"
              : "bg-blue-600 border border-blue-700 hover:bg-blue-700"}
            focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-400
          `}
          aria-label={sidebarCollapsed ? "Expandir chat" : "Ocultar chat"}
          title={sidebarCollapsed ? "Expandir chat" : "Ocultar chat"}
          type="button"
        >
          <span
            className={`
              text-2xl font-bold select-none
              transition-transform duration-500 ease-out
              ${sidebarCollapsed ? "text-blue-600" : "text-white rotate-180"}
              group-hover:scale-110
            `}
          >
            ❮
          </span>
        </button>

        <div
          className="flex-1 flex flex-col h-full p-6 transition-all duration-300"
          style={{ marginLeft: 0 }}
        >
          {imagesOpen && (
            <GeneratedFiles
              open={imagesOpen}
              onClose={() => setImagesOpen(false)}
            />
          )}

          {!imagesOpen && messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <h2 className="text-4xl font-bold mt-12 pb-2 bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-theme-dark)]">
                Olá, como posso ajudar hoje?
              </h2>
              <p className="text-gray-500 text-lg mt-4">
                Escolha diferentes modelos e teste novas ideias
              </p>
            </div>
          ) : (
            !imagesOpen && (
              <MessageListVirtualized
                messages={messages}
                height={window.innerHeight - 180}
                width="100%"
                className="py-4 px-2"
              />
            )
          )}

          {!imagesOpen && (
            <div className="mt-2 flex flex-col gap-4 rounded-3xl shadow-xl p-6 border border-gray-200 bg-white">
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
              <ChatControls
                model={model}
                setModel={setModel}
                temperature={temperature}
                setTemperature={setTemperature}
                isTemperatureLocked={isTemperatureLocked}
              />
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

export default TextGeneration;

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
import { useAuth } from "../../../context/AuthContext";
import GeneratedFiles from "../components/chat/GeneratedFiles";

// ✅ NOVOS IMPORTS
import { getQuotaStatus } from "../../../services/quotaService";
import QuotaBannerSlot from "../components/QuotaBannerSlot";

function TextGeneration() {
  const { user } = useAuth();
  const { chats, chatId, messages, setMessages, chatVisible, chatIdSetter, loadChat, createNewChat, updateChatList } =
    useChats();

  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [files, setFiles] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mainSidebarCollapsed, setMainSidebarCollapsed] = useState(true);
  const [imagesOpen, setImagesOpen] = useState(false);

  // ✅ estado da quota
  const [quota, setQuota] = useState({ state: "NONE" });

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

  // ✅ token para chamar quota-status (ajuste se você guarda em outro lugar)
  const token = localStorage.getItem("token");

  const refreshQuota = async () => {
    try {
      const q = await getQuotaStatus(token);
      setQuota(q || { state: "NONE" });
    } catch {
      setQuota({ state: "NONE" });
    }
  };

  // carrega quota ao abrir
  useEffect(() => {
    if (user) refreshQuota();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // se bloquear, avisar uma vez
  useEffect(() => {
    if (quota?.state === "BLOCK_100") {
      toast.info("Você atingiu sua cota mensal. Faça upgrade para continuar.");
    }
  }, [quota?.state]);

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

  // ✅ bloqueio efetivo do envio no UI
  const isBlocked = quota?.state === "BLOCK_100";

  return (
    <Layout mainSidebarCollapsed={mainSidebarCollapsed}>
      <div className="flex w-full h-[calc(100vh-120px)] overflow-hidden bg-gray-50 font-inter">
        <div
          className={`absolute top-0 left-0 h-full transition-all duration-300 z-40 ${
            sidebarCollapsed ? "-ml-72" : "ml-0"
          }`}
        >
          <Sidebar
            chats={chats}
            chatId={chatId}
            loadChat={loadChat}
            createNewChat={createNewChat}
            updateChatList={updateChatList}
            setImagesOpen={setImagesOpen}
          />
        </div>

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
            ${
              sidebarCollapsed
                ? "bg-white border border-gray-300 hover:bg-gray-100"
                : "bg-blue-600 border border-blue-700 hover:bg-blue-700"
            }
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

        <div className="flex-1 flex flex-col h-full p-6 transition-all duration-300" style={{ marginLeft: 0 }}>
          {imagesOpen && <GeneratedFiles open={imagesOpen} onClose={() => setImagesOpen(false)} />}

          {!imagesOpen && messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <h2 className="text-4xl font-bold mt-12 pb-2 bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-theme-dark)]">
                Olá, como posso ajudar hoje?
              </h2>
              <p className="text-gray-500 text-lg mt-4">Escolha diferentes modelos e teste novas ideias</p>
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
              {/* ✅ Banner de quota (slot fixo, sem layout shift) */}
              <QuotaBannerSlot quota={quota} />

              <ChatInput
                input={input}
                setInput={setInput}
                handleSend={async () => {
                  if (isBlocked) {
                    toast.error("🚫 Você atingiu o limite da sua cota mensal. Faça upgrade para continuar.");
                    return;
                  }

                  await handleSend({ input, files, model, temperature, isTemperatureLocked });

                  setInput("");
                  setFiles([]);

                  // ✅ atualiza quota após enviar (porque backend incrementa)
                  refreshQuota();
                }}
                handleStop={handleStop}
                loading={loading || isBlocked}
                files={files}
                setFiles={setFiles}
                attachmentsAllowed={attachmentsAllowed}
                // ✅ Se seu ChatInput aceitar "disabled", use isto:
                disabled={isBlocked}
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

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { chatRoutes } from "../../../services/apiRoutes";

export default function useChats() {
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatVisible, setChatVisible] = useState(true);
  
  // Loading states
  const [chatsLoading, setChatsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // Error states
  const [chatsError, setChatsError] = useState(null);
  const [messagesError, setMessagesError] = useState(null);

  useEffect(() => {
    const fetchChats = async () => {
      setChatsLoading(true);
      setChatsError(null);
      
      try {
        const res = await fetch(chatRoutes.list, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Falha ao carregar chats (${res.status})`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(text || "Resposta não é JSON");
        }

        const data = await res.json();
        setChats(data || []);
      } catch (err) {
        console.error("Erro ao carregar chats:", err);
        setChatsError(err.message || "Erro ao carregar chats");
        toast.error("Erro ao carregar chats");
      } finally {
        setChatsLoading(false);
      }
    };
    fetchChats();
  }, []);

  const loadChat = async (id) => {
    setMessagesLoading(true);
    setMessagesError(null);
    
    try {
      setChatVisible(false);
      setTimeout(async () => {
        setChatId(id);

        const res = await fetch(chatRoutes.messages(id), { credentials: "include" });
        
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Falha ao carregar mensagens (${res.status})`);
        }
        
        const data = await res.json();
        setMessages(data.messages || []);
        setChatVisible(true);
        setMessagesLoading(false);
      }, 200);
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
      setMessagesError(err.message || "Erro ao carregar mensagens");
      toast.error("Erro ao carregar mensagens do chat");
      setMessagesLoading(false);
      setChatVisible(true);
    }
  };

  const retryLoadChats = () => {
    const fetchChats = async () => {
      setChatsLoading(true);
      setChatsError(null);
      
      try {
        const res = await fetch(chatRoutes.list, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Falha ao carregar chats (${res.status})`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(text || "Resposta não é JSON");
        }

        const data = await res.json();
        setChats(data || []);
      } catch (err) {
        console.error("Erro ao carregar chats:", err);
        setChatsError(err.message || "Erro ao carregar chats");
        toast.error("Erro ao carregar chats");
      } finally {
        setChatsLoading(false);
      }
    };
    fetchChats();
  };

  const retryLoadMessages = () => {
    if (chatId) {
      loadChat(chatId);
    }
  };

  const createNewChat = () => {
    setChatVisible(false);
    setMessagesError(null);
    setTimeout(() => {
      setChatId(null);
      setMessages([]);
      setChatVisible(true);
    }, 200);
  };

  const updateChatList = (chatData, action, newTitle) => {
    setChats((prev) => {
      let updated;

      if (action === "add") {
        const exists = prev.find((c) => c.id === chatData.id);
        updated = exists
          ? prev.map((c) => (c.id === chatData.id ? { ...c, ...chatData } : { ...c }))
          : [{ ...chatData }, ...prev.map((c) => ({ ...c }))];

        setChatId(chatData.id);
        loadChat(chatData.id);
        return updated;
      }

      // rename, archive, unarchive, delete
      updated = prev
        .map((ch) => {
          if (!ch) return null;
          if (ch.id !== chatData.id) return { ...ch };
          if (action === "rename") return { ...ch, title: newTitle || "Sem título" };
          if (action === "archive") return { ...ch, archived: true };
          if (action === "unarchive") return { ...ch, archived: false };
          return { ...ch };
        })
        .filter(Boolean)
        .filter((ch) => !(action === "delete" && ch.id === chatData.id));

      if (action === "delete" && chatData.id === chatId) {
        setChatId(null);
        setMessages([]);
        setMessagesError(null);
      }

      return updated;
    });
  };

  return {
    chats,
    chatId,
    messages,
    setMessages,
    chatVisible,
    chatIdSetter: setChatId,
    loadChat,
    createNewChat,
    updateChatList,
    // Loading states
    chatsLoading,
    messagesLoading,
    // Error states
    chatsError,
    messagesError,
    // Retry functions
    retryLoadChats,
    retryLoadMessages,
  };
}

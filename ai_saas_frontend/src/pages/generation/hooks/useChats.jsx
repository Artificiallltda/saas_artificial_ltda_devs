import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { chatRoutes } from "../../../services/apiRoutes";

export default function useChats() {
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatVisible, setChatVisible] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(chatRoutes.list, { credentials: "include" });
        const data = await res.json();
        setChats(data || []);
      } catch (err) {
        console.error("Erro ao carregar chats:", err);
        toast.error("Erro ao carregar chats");
      }
    };
    fetchChats();
  }, []);

  const loadChat = async (id) => {
    try {
      setChatVisible(false);
      setTimeout(async () => {
        setChatId(id);

        const res = await fetch(chatRoutes.messages(id), { credentials: "include" });
        const data = await res.json();
        setMessages(data.messages || []);
        setChatVisible(true);
      }, 200);
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
      toast.error("Erro ao carregar mensagens do chat");
    }
  };

  const createNewChat = () => {
    setChatVisible(false);
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
  };
}

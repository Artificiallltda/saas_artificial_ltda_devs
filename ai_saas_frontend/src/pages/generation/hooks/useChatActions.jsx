import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { aiRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService"; // ← import do service
import { useLanguage } from "../../../context/LanguageContext";

export default function useChatActions({ chatId, setChatId, messages, setMessages, updateChatList }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [controller, setController] = useState(null);
  const messagesEndRef = useRef(null);

  const handleSend = async ({ input, files, model, temperature, isTemperatureLocked }) => {
    if (!input.trim() && files.length === 0) {
      toast.warning(t("generation.text.actions.message_or_attachment_required"));
      return;
    }

    const userInput = input;
    const userFiles = [...files];

    const attachments = userFiles.map((f) => ({
      name: f.name,
      mimetype: f.type,
      url: URL.createObjectURL(f),
      isPreview: true,
    }));

    const userMessage = { role: "user", content: userInput, attachments };
    const assistantPlaceholder = { role: "assistant", content: "typing" };
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setLoading(true);

    const abortController = new AbortController();
    setController(abortController);

    try {
      let body;

      if (userFiles.length > 0) {
        body = new FormData();
        body.append("input", userInput);
        body.append("chat_id", chatId || "");
        body.append("model", model);
        body.append("temperature", isTemperatureLocked ? 1 : temperature);
        userFiles.forEach((f) => body.append("files", f));
      } else {
        body = JSON.stringify({
          input: userInput,
          chat_id: chatId,
          model,
          temperature: isTemperatureLocked ? 1 : temperature,
        });
      }

      const aiData = await apiFetch(aiRoutes.generateText, {
        method: "POST",
        body,
        headers: userFiles.length === 0 ? { "Content-Type": "application/json" } : {},
        signal: abortController.signal,
      });

      if (aiData.error) throw new Error(aiData.error);

      setChatId(aiData.chat_id);

      const newChat = {
        id: aiData.chat_id,
        title: aiData.chat_title || t("generation.text.sidebar.new_chat"),
        archived: false,
        created_at: aiData.created_at || new Date().toISOString(),
        snippet: aiData.messages?.slice(-1)[0]?.content || "",
      };
      updateChatList(newChat, "add");

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.role === "user" && msg.attachments?.some((a) => a.isPreview)) {
            const backendAttachments = aiData.messages?.find((m) => m.role === "user")?.attachments;
            const mergedAttachments = msg.attachments.map((a, i) => ({
              ...a,
              url: backendAttachments?.[i]?.id
                ? `/api/chats/attachments/${backendAttachments[i].id}`
                : a.url,
              isPreview: false,
            }));
            return { ...msg, attachments: mergedAttachments };
          }

          if (msg.role === "assistant" && msg.content === "typing") {
            const lastMsg = aiData.messages?.slice(-1)[0];
            return { role: "assistant", content: lastMsg?.content || "", attachments: lastMsg?.attachments || [] };
          }

          return msg;
        })
      );

      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      if (err.name === "AbortError") return;
      toast.error(err.message || t("generation.text.error_toast"));
      setMessages((prev) => prev.filter((m) => m.content !== "typing"));
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (controller) {
      controller.abort();
      setLoading(false);
      setMessages((prev) => prev.filter((m) => m.content !== "typing"));
    }
  };

  return { loading, messagesEndRef, handleSend, handleStop };
}

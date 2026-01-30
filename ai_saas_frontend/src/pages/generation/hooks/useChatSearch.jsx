import { useState, useEffect } from "react";
import { chatRoutes } from "../../../services/apiRoutes";

function escapeHtml(text) {
  return text?.replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  }) || "";
}

function getSnippet(text = "", query, wordsBefore = 1, length = 80) {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return null;

  const before = text.slice(0, idx).trim().split(/\s+/);
  let startIdx = idx;
  if (before.length > wordsBefore) {
    const removed = before.slice(-wordsBefore).join(" ");
    startIdx = idx - removed.length - 1;
  } else {
    startIdx = 0;
  }

  if (startIdx < 0) startIdx = 0;

  const endIdx = Math.min(startIdx + length, text.length);
  let snippet = text.substring(startIdx, endIdx);

  if (startIdx > 0) snippet = "..." + snippet;
  if (endIdx < text.length) snippet += "...";

  const regex = new RegExp(`(${query})`, "gi");
  snippet = escapeHtml(snippet).replace(regex, "<strong>$1</strong>");

  return snippet;
}

export default function useChatSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const fetchChats = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: query });
        const res = await fetch(`${chatRoutes.list}?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });
        
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Falha ao buscar chats (${res.status})`);
        }
        
        let data = await res.json();

        if (!data) data = [];

        data = data.map((chat) => {
          if (!chat.messages || chat.messages.length === 0) {
            return { ...chat, snippet: null };
          }

          const match = chat.messages.find((m) =>
            m.content && m.content.toLowerCase().includes(query.toLowerCase())
          );

          if (match) {
            const snippet = getSnippet(match.content, query);
            return { ...chat, snippet };
          }
          return { ...chat, snippet: null };
        });

        setResults(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Erro ao buscar chats:", err);
          setError(err.message || "Erro ao buscar chats");
        }
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchChats, 300); // debounce
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const handleChange = (e) => setQuery(e.target.value);

  return { query, results, handleChange, loading, error, setQuery };
}

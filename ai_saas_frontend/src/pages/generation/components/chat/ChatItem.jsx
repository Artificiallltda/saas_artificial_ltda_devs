import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  Edit2,
  Trash2,
  Archive,
  CornerUpLeft,
} from "lucide-react";
import { toast } from "react-toastify";
import { chatRoutes } from "../../../../services/apiRoutes";
import { apiFetch } from "../../../../services/apiService";

export default function ChatItem({ chat, selected, loadChat, onUpdateList }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const buttonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        !e.target.closest(".chat-dropdown")
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 120;
    const viewportHeight = window.innerHeight;

    const top =
      rect.bottom + dropdownHeight > viewportHeight
        ? rect.top - dropdownHeight - 4
        : rect.bottom + 4;

    setDropdownPos({ top, left: rect.right - 144 });
    setOpen((prev) => !prev);
  };

  const handleRename = async () => {
    try {
      await apiFetch(`${chatRoutes.list}${chat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      toast.success("Chat renomeado!");
      onUpdateList(chat, "rename", newTitle);
      setRenaming(false);
    } catch (err) {
      toast.error(err.message || "Erro ao renomear");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Deseja realmente deletar este chat?")) return;

    try {
      await apiFetch(`${chatRoutes.list}${chat.id}`, {
        method: "DELETE",
      });

      toast.success("Chat deletado!");
      onUpdateList(chat, "delete");
    } catch (err) {
      toast.error(err.message || "Erro ao deletar");
    }
  };

  const handleArchiveToggle = async () => {
    try {
      const endpoint = chat.archived
        ? `${chatRoutes.list}${chat.id}/unarchive`
        : `${chatRoutes.list}${chat.id}/archive`;

      await apiFetch(endpoint, { method: "PATCH" });

      toast.success(`Chat ${chat.archived ? "desarquivado" : "arquivado"}!`);
      onUpdateList(chat, chat.archived ? "unarchive" : "archive");
    } catch (err) {
      toast.error(err.message || "Erro ao atualizar status do chat");
    }
  };

  const dropdown = open ? (
    <div
      className="
        chat-dropdown w-36 z-[1000] rounded-md shadow-lg
        bg-white dark:bg-neutral-950
        border border-gray-200 dark:border-neutral-800
        text-gray-900 dark:text-neutral-100
        overflow-hidden
      "
      style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          setRenaming(true);
          setOpen(false);
        }}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-900 w-full text-left text-sm transition"
        type="button"
      >
        <Edit2 className="w-4 h-4" /> Renomear
      </button>

      <button
        onClick={handleArchiveToggle}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-900 w-full text-left text-sm transition"
        type="button"
      >
        {chat.archived ? (
          <>
            <CornerUpLeft className="w-4 h-4" /> Desarquivar
          </>
        ) : (
          <>
            <Archive className="w-4 h-4" /> Arquivar
          </>
        )}
      </button>

      <button
        onClick={handleDelete}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-900 w-full text-left text-sm text-red-500 transition"
        type="button"
      >
        <Trash2 className="w-4 h-4" /> Excluir
      </button>
    </div>
  ) : null;

  return (
    <div
      className={`
        group flex items-center justify-between px-3 py-2 mb-1 rounded-md text-sm truncate
        transition
        ${
          selected
            ? "bg-[var(--color-primary)] text-white"
            : "hover:bg-gray-100 dark:hover:bg-neutral-900 text-gray-800 dark:text-neutral-200"
        }
      `}
      title={chat.title}
    >
      <div
        className="flex items-center w-full rounded-md group"
        onClick={() => loadChat(chat.id)}
      >
        <div className="flex-1 min-w-0 cursor-default">
          {renaming ? (
            <input
              className="
                w-full text-sm rounded-md px-2 py-1
                bg-white dark:bg-neutral-950
                text-gray-900 dark:text-neutral-100
                border border-gray-300 dark:border-neutral-800
                focus:outline-none focus:ring-2 focus:ring-blue-500/40
              "
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          ) : (
            <span className="truncate block text-sm">{chat.title}</span>
          )}
        </div>

        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            ref={buttonRef}
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-neutral-800 transition"
            onClick={toggleDropdown}
            type="button"
            aria-label="Abrir menu do chat"
          >
            <MoreVertical
              className={`w-4 h-4 ${
                selected ? "text-white" : "text-gray-500 dark:text-neutral-400"
              }`}
            />
          </button>
        </div>
      </div>

      {open &&
        createPortal(
          dropdown,
          typeof document !== "undefined" ? document.body : null
        )}
    </div>
  );
}
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Edit2, Trash2, Archive, CornerUpLeft } from "lucide-react";
import { toast } from "react-toastify";
import { chatRoutes } from "../../../../services/apiRoutes";
import { apiFetch } from "../../../../services/apiService";
import { useLanguage } from "../../../../context/LanguageContext";

export default function ChatItem({ chat, selected, loadChat, onUpdateList }) {
  const { t } = useLanguage();
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

    let top;
    top = rect.bottom + dropdownHeight > viewportHeight ? rect.top - dropdownHeight - 4 : rect.bottom + 4;

    setDropdownPos({ top, left: rect.right - 144 });
    setOpen((prev) => !prev);
  };

  const handleRename = async () => {
    try {
      const data = await apiFetch(`${chatRoutes.list}${chat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      toast.success(t("generation.text.chat_item.rename_success"));
      onUpdateList(chat, "rename", newTitle);
      setRenaming(false);
    } catch (err) {
      toast.error(err.message || t("generation.text.chat_item.rename_error"));
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("generation.text.chat_item.delete_confirm"))) return;

    try {
      await apiFetch(`${chatRoutes.list}${chat.id}`, {
        method: "DELETE",
      });

      toast.success(t("generation.text.chat_item.delete_success"));
      onUpdateList(chat, "delete");
    } catch (err) {
      toast.error(err.message || t("generation.text.chat_item.delete_error"));
    }
  };

  const handleArchiveToggle = async () => {
    try {
      const endpoint = chat.archived
        ? `${chatRoutes.list}${chat.id}/unarchive`
        : `${chatRoutes.list}${chat.id}/archive`;

      await apiFetch(endpoint, { method: "PATCH" });

      toast.success(
        chat.archived
          ? t("generation.text.chat_item.unarchive_success")
          : t("generation.text.chat_item.archive_success")
      );
      onUpdateList(chat, chat.archived ? "unarchive" : "archive");
    } catch (err) {
      toast.error(err.message || t("generation.text.chat_item.archive_toggle_error"));
    }
  };

  return (
    <div
      className={`group flex items-center justify-between px-3 py-2 mb-1 rounded-md text-sm truncate ${
        selected ? "bg-[var(--color-primary)] text-white" : "hover:bg-gray-100 text-gray-800"
      }`}
      title={chat.title}
    >
      <div className="flex items-center w-full rounded-md group" onClick={() => loadChat(chat.id)}>
        <div className="flex-1 min-w-0 cursor-default">
          {renaming ? (
            <input
              className="w-full text-sm rounded-md border border-gray-300 focus:outline-none"
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
          <button ref={buttonRef} className="p-1 rounded cursor-pointer" onClick={toggleDropdown}>
            <MoreVertical className={`w-4 h-4 ${selected ? "text-white" : "text-gray-500"}`} />
          </button>
        </div>
      </div>

      {open &&
        createPortal(
          <div
            className="chat-dropdown bg-white border border-gray-200 rounded-md shadow-lg w-36 z-[1000]"
            style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setRenaming(true);
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm"
            >
              <Edit2 className="w-4 h-4" /> {t("generation.text.chat_item.rename")}
            </button>

            <button
              onClick={handleArchiveToggle}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm"
            >
              {chat.archived ? (
                <>
                  <CornerUpLeft className="w-4 h-4" /> {t("generation.text.chat_item.unarchive")}
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" /> {t("generation.text.chat_item.archive")}
                </>
              )}
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm text-red-500"
            >
              <Trash2 className="w-4 h-4" /> {t("generation.text.chat_item.delete")}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
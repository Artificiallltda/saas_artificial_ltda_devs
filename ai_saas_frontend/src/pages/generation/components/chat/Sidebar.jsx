import { useState, useRef, useEffect } from "react";
import { Plus, Search, File, FolderMinus, Folder, MessageSquare } from "lucide-react";
import ChatItem from "./ChatItem";
import useChatSearch from "../../hooks/useChatSearch";
import { useLanguage } from "../../../../context/LanguageContext";
import { ChatSkeleton, SearchSkeleton } from "../../../../components/SkeletonLoader";
import { ChatErrorState, SearchErrorState } from "../../../../components/ErrorState";
import { ChatEmptyState, SearchEmptyState } from "../../../../components/EmptyState";

export default function Sidebar({ 
  chats, 
  chatId, 
  loadChat, 
  createNewChat, 
  updateChatList, 
  setImagesOpen,
  chatsLoading,
  chatsError,
  retryLoadChats 
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const { t } = useLanguage();

  const archived = chats.filter((c) => c.archived);
  const active = chats.filter((c) => !c.archived);

  const { query, results, handleChange, loading: searchLoading, error: searchError } = useChatSearch();

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchClick = (chat) => {
    loadChat(chat.id);
    setImagesOpen(false);
    setSearchOpen(false);
  };

  // Render loading state for chats
  if (chatsLoading) {
    return (
      <div className="relative w-full bg-white border-r border-gray-200 flex flex-col h-full pt-4 overflow-y-auto z-30">
        <div className="flex flex-col gap-3 p-4 w-full">
          <div className="w-full flex flex-col space-y-3">
            <div className="w-full flex flex-col items-center py-3 rounded-lg bg-gray-50 text-gray-900">
              <div className="w-5 h-5 bg-gray-200 rounded mb-1 animate-pulse"></div>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gray-200">
              <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="relative mt-2">
            <div className="w-full h-10 bg-gray-100 rounded-xl animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          <ChatSkeleton count={4} />
        </div>
      </div>
    );
  }

  // Render error state for chats
  if (chatsError) {
    return (
      <div className="relative w-full bg-white border-r border-gray-200 flex flex-col h-full pt-4 overflow-y-auto z-30">
        <div className="flex flex-col gap-3 p-4 w-full">
          <div className="w-full flex flex-col space-y-3">
            <div className="w-full flex flex-col items-center py-3 rounded-lg bg-gray-50 text-gray-900">
              <File className="w-5 h-5 mb-1" />
              <span className="text-sm font-medium">{t('generation.text.sidebar.generations')}</span>
            </div>
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[var(--color-primary)] text-white hover:brightness-105 transition-colors mx-0"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium text-sm">{t('generation.text.sidebar.new_chat')}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 px-4">
          <ChatErrorState onRetry={retryLoadChats} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full bg-white border-r border-gray-200 flex flex-col h-full pt-4 overflow-y-auto z-30"
      data-chat-sidebar=""
    >
      {/* Conteúdo da Sidebar */}
      <div className="flex flex-col gap-3 p-4 w-full">
        <div className="w-full flex flex-col space-y-3">
          {/* Gerações */}
          <button
            onClick={() => setImagesOpen(true)}
            className="w-full flex flex-col items-center py-3 rounded-lg bg-gray-50 text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <File className="w-5 h-5 mb-1" />
            <span className="text-sm font-medium">{t('generation.text.sidebar.generations')}</span>
          </button>

          {/* Novo Chat */}
          <button
            onClick={() => {
              createNewChat();
              setImagesOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[var(--color-primary)] text-white hover:brightness-105 transition-colors mx-0"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">{t('generation.text.sidebar.new_chat')}</span>
          </button>
        </div>

        {/* Buscar em chats */}
        <div className="relative mt-2" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              handleChange(e);
              setSearchOpen(true);
            }}
            placeholder={t('generation.text.sidebar.search_placeholder')}
            className="w-full pl-9 px-5 py-2 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 overflow-y-auto shadow-sm focus:outline-none focus:shadow-md"
          />

          {searchOpen && (
            <div className="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 animate-fadeIn origin-top">
              {searchLoading ? (
                <SearchSkeleton count={3} />
              ) : searchError ? (
                <div className="p-4">
                  <SearchErrorState />
                </div>
              ) : results.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto divide-y divide-gray-200">
                  {results.map((chat) => (
                    <li
                      key={chat.id}
                      onClick={() => handleSearchClick(chat)}
                      className="flex flex-col gap-1 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {chat.archived ? (
                          <Folder className="w-4 h-4 text-gray-400" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="flex-1 text-sm truncate">{chat.title}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(chat.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {chat.snippet && (
                        <p
                          className="text-xs text-gray-500 truncate"
                          dangerouslySetInnerHTML={{ __html: chat.snippet }}
                        ></p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : query ? (
                <div className="p-4">
                  <SearchEmptyState />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Chats Ativos */}
      <h2 className="font-semibold text-gray-700 mb-2 text-sm px-4">{t('generation.text.sidebar.chats')}</h2>
      <div className="flex-1 overflow-y-auto pr-1">
        {active.length === 0 && !chatsLoading && !chatsError ? (
          <div className="px-3">
            <ChatEmptyState onCreateChat={createNewChat} />
          </div>
        ) : (
          active.map((c) => (
            <ChatItem
              key={c.id}
              chat={c}
              selected={chatId === c.id}
              loadChat={() => {
                loadChat(c.id);
                setImagesOpen(false);
              }}
              onUpdateList={updateChatList}
            />
          ))
        )}

        {/* Chats Arquivados */}
        {archived.length > 0 && (
          <div className="mt-4">
            <button
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setShowArchived((prev) => !prev)}
            >
              <FolderMinus className="w-4 h-4" />
              {showArchived ? t('generation.text.sidebar.hide_archived') : t('generation.text.sidebar.show_archived')}
            </button>

            {showArchived && (
              <div className="mt-2 space-y-1">
                {archived.map((c) => (
                  <ChatItem
                    key={c.id}
                    chat={c}
                    selected={chatId === c.id}
                    loadChat={() => {
                      loadChat(c.id);
                      setImagesOpen(false);
                    }}
                    onUpdateList={updateChatList}
                    archived
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
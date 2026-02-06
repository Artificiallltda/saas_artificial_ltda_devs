import {
  Bell,
  User,
  Search,
  Settings,
  LogOut,
  Folder,
  FileText,
  Menu,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  PlayCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  projectRoutes,
  generatedContentRoutes,
  profileRoutes
} from "../../services/apiRoutes";
import { useNotifications } from "../../context/NotificationContext";
import LanguageSelector from "../common/LanguageSelector";
import TourButton from "../tour/TourButton";

export default function Header({
  onMenuClick,
  onToggleCollapse,
  sidebarCollapsed,
  isTextGeneration = false
}) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const { unreadCount, fetchNotifications } = useNotifications();

  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [perfilPhotoUrl, setPerfilPhotoUrl] = useState("");

  // Foto do perfil
  useEffect(() => {
    const fetchPhoto = async () => {
      if (!user?.perfil_photo) return;
      try {
        const res = await fetch(profileRoutes.getPhoto(user.id), {
          credentials: "include"
        });
        const blob = await res.blob();
        setPerfilPhotoUrl(URL.createObjectURL(blob));
      } catch {
        setPerfilPhotoUrl("");
      }
    };
    fetchPhoto();
  }, [user]);

  // debounce simples
  const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  };

  const truncate = (str, length = 50) =>
    str && str.length > length ? str.substring(0, length) + "..." : str || "";

  const fetchSearchResults = useCallback(
    debounce(async (query) => {
      if (!query.trim()) return setSearchResults([]);
      try {
        const [projRes, contRes] = await Promise.all([
          fetch(`${projectRoutes.list}?q=${query}`, { credentials: "include" }).then(r => r.json()),
          fetch(`${generatedContentRoutes.list}?q=${query}`, { credentials: "include" }).then(r => r.json())
        ]);

        setSearchResults([
          ...(projRes || []).map(p => ({
            type: "project",
            id: p.id,
            title: p.name || p.title,
            created_at: p.created_at
          })),
          ...(contRes || []).map(c => ({
            type: "content",
            id: c.id,
            title: truncate(c.prompt),
            created_at: c.created_at
          }))
        ]);
        setSearchOpen(true);
      } catch {}
    }, 400),
    []
  );

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    fetchSearchResults(e.target.value);
  };

  const handleSearchClick = (item) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    if (item.type === "project") {
      navigate(`/workspace/projects/${item.id}/modify-content`);
    } else {
      navigate(`/workspace/generated-contents`);
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    // Garantir que o ícone do tema esteja correto
    const themeButton = document.querySelector('[aria-label="Alternar tema"]');
    if (themeButton) {
      themeButton.textContent = document.body.classList.contains('dark-mode') ? '🌞' : '🌙';
    }
  }, []);

  return (
      <header
        className="flex items-center justify-between px-6 py-4 bg-white w-full relative z-40 border-0 border-b-0 shadow-none outline-none"
        ref={menuRef}
      >
      {/* ESQUERDA */}
      <div className="flex items-center gap-2 w-full max-w-md" ref={searchRef}>
        {/* BOTÃO MENU (MOBILE) - PARA SIDEBAR PRINCIPAL */}
        {!isTextGeneration && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition"
            aria-label={t("header.open_main_menu")}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* BOTÕES (MOBILE) – TEXTO: PRINCIPAL + CHAT */}
        {isTextGeneration && (
          <>
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition"
              aria-label={t("header.open_main_menu")}
              title={t("header.main_menu")}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                window.closeMainSidebar?.();
                window.toggleChatSidebar?.();
              }}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition"
              aria-label={t("header.open_chat_menu")}
              title={t("header.chat_menu")}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </>
        )}

        {/* BOTÃO COLAPSAR – ESCONDER NO MOBILE PARA EVITAR 3º CONTROLE */}
        <div className="hidden md:flex items-center">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-md hover:bg-gray-100 transition"
            title={sidebarCollapsed ? t("header.expand_menu") : t("header.collapse_menu")}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* SEARCH */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={t("header.search.placeholder")}
            className="w-full pl-10 py-2 rounded-lg border text-sm"
          />

          {searchOpen && searchResults.length > 0 && (
            <div className="absolute mt-1 w-full bg-white border rounded-md shadow-lg z-40">
              <ul className="max-h-80 overflow-y-auto divide-y">
                {searchResults.map(item => (
                  <li
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSearchClick(item)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {item.type === "project" ? (
                      <Folder className="w-4 h-4 text-blue-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-purple-500" />
                    )}
                    <span className="flex-1 text-sm">{item.title}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString(t("dates.locale"))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* DIREITA */}
      <div className="flex items-center gap-2 relative">
        <TourButton className="hidden md:flex" />
        
        <button
          onClick={() => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            // Atualizar o ícone
            event.target.textContent = isDark ? '🌞' : '🌙';
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Alternar tema"
        >
          🌙
        </button>
        <LanguageSelector />
        
        <div className="relative p-1.5 rounded-md hover:bg-gray-100 cursor-pointer">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full px-1">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>

        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-7 h-7 rounded-full overflow-hidden border-0 ring-1 ring-gray-200/70 hover:ring-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
        >
          {perfilPhotoUrl ? (
            <img src={perfilPhotoUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-xl shadow-black/5 ring-1 ring-black/5 text-sm z-40 overflow-hidden">
            <ul className="py-1">
              <li>
                <Link to="/profile" className="flex gap-2 px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 transition-colors outline-none">
                  <User className="w-4 h-4" /> {t("header.profile")}
                </Link>
              </li>
              <li>
                <Link to="/settings" className="flex gap-2 px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 transition-colors outline-none">
                  <Settings className="w-4 h-4" /> {t("header.settings")}
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    localStorage.removeItem('hasSeenTour');
                    window.location.reload();
                  }}
                  className="w-full text-left flex gap-2 px-4 py-2 hover:bg-blue-50 text-blue-600 transition-colors outline-none"
                >
                  <PlayCircle className="w-4 h-4" /> {t('tour.restart_tour') || 'Tour Guiado'}
                </button>
              </li>
              <li>
                <button
                  onClick={logout}
                  className="w-full text-left flex gap-2 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors outline-none"
                >
                  <LogOut className="w-4 h-4" /> {t("header.logout")}
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
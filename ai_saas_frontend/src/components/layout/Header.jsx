import {
  Bell,
  User,
  Search,
  Settings,
  LogOut,
  Folder,
  FileText,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  projectRoutes,
  generatedContentRoutes,
  profileRoutes
} from "../../services/apiRoutes";
import { useNotifications } from "../../context/NotificationContext";

export default function Header({
  onMenuClick,
  onToggleCollapse,
  sidebarCollapsed
}) {
  const { user, logout } = useAuth();
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

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b bg-white w-full relative z-50"
      ref={menuRef}
    >
      {/* ESQUERDA */}
      <div className="flex items-center gap-2 w-full max-w-md" ref={searchRef}>
        {/* BOTÃO MENU (MOBILE) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* BOTÃO COLAPSAR (DESKTOP) */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 rounded-md hover:bg-gray-100 transition"
          title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* SEARCH */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar projetos, conteúdos..."
            className="w-full pl-10 py-2 rounded-lg border text-sm"
          />

          {searchOpen && searchResults.length > 0 && (
            <div className="absolute mt-1 w-full bg-white border rounded-md shadow-lg z-50">
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
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* DIREITA */}
      <div className="flex items-center gap-4 relative">
        <div className="relative p-2 rounded-md hover:bg-gray-100 cursor-pointer">
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
          className="w-8 h-8 rounded-full overflow-hidden border"
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
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-md shadow-lg text-sm z-50">
            <ul>
              <li>
                <Link to="/profile" className="flex gap-2 px-4 py-2 hover:bg-gray-100">
                  <User className="w-4 h-4" /> Perfil
                </Link>
              </li>
              <li>
                <Link to="/settings" className="flex gap-2 px-4 py-2 hover:bg-gray-100">
                  <Settings className="w-4 h-4" /> Configurações
                </Link>
              </li>
              <li>
                <button
                  onClick={logout}
                  className="w-full text-left flex gap-2 px-4 py-2 hover:bg-red-100 text-red-600"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}

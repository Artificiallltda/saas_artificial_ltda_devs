import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  FileText,
  Image,
  Video,
  CreditCard,
  User,
  Settings,
  ShieldCheck
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const navItems = [
  { labelKey: "sidebar.dashboard", icon: LayoutDashboard, path: "/" },
  { labelKey: "sidebar.text_generation", icon: FileText, path: "/text-generation" },
  { labelKey: "sidebar.image_generation", icon: Image, path: "/image-generation" },
  { labelKey: "sidebar.video_generation", icon: Video, path: "/video-generation" },
  { labelKey: "sidebar.subscription", icon: CreditCard, path: "/subscription" },
  { labelKey: "sidebar.profile", icon: User, path: "/profile" },
  { labelKey: "sidebar.settings", icon: Settings, path: "/settings" }
];

function ChatToggleButton({ collapsed }) {
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [leftPos, setLeftPos] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    // Função para atualizar o estado quando a sidebar de chat abrir/fechar
    const update = () => {
      const mainSidebar = document.querySelector('[data-main-sidebar]');
      const chatSidebar = document.querySelector('[data-chat-sidebar]');
      const isOpen = !!chatSidebar && chatSidebar.offsetWidth > 0;
      setChatSidebarOpen(isOpen);
      const left = (mainSidebar?.offsetWidth || 0) + (chatSidebar?.offsetWidth || 0);
      setLeftPos(left);
    };

    // Verificar inicialmente
    update();

    // Observar mudanças
    const chatSidebarEl = document.querySelector('[data-chat-sidebar]');
    const mainSidebarEl = document.querySelector('[data-main-sidebar]');
    const observer = new MutationObserver(update);
    const observerMain = new MutationObserver(update);

    if (chatSidebarEl) {
      observer.observe(chatSidebarEl, { 
        attributes: true, 
        attributeFilter: ['class', 'style'] 
      });
    }

    if (mainSidebarEl) {
      observerMain.observe(mainSidebarEl, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    const onResize = () => update();
    window.addEventListener('resize', onResize);

    // Atualizar periodicamente como fallback
    const interval = setInterval(update, 200);

    return () => {
      observer.disconnect();
      observerMain.disconnect();
      clearInterval(interval);
      window.removeEventListener('resize', onResize);
    };
  }, [collapsed]);

  return createPortal(
    <button
      onClick={() => window.toggleChatSidebar?.()}
      title={t("sidebar.chat_toggle")}
      className={`
        group hidden md:flex
        fixed z-40
        h-16 w-9
        items-center justify-center
        bg-blue-600 hover:bg-blue-700 text-white
        rounded-r-xl rounded-l-none shadow-lg
        ring-1 ring-black/10
        transition-all
        top-1/2 -translate-y-1/2
        hover:scale-[1.02]
      `}
      style={{ left: Math.max(0, leftPos - 6) }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        className={`${chatSidebarOpen ? "rotate-180" : ""} transition-transform`}
        aria-hidden="true"
      >
        <path d="M5 4 L19 12 L5 20 Z" className="fill-white" />
      </svg>
    </button>,
    document.body
  );
}
export default function Sidebar({
  collapsed = false,
  isOpen = false,
  onClose
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const touchStartX = useRef(null);
  const [planName, setPlanName] = useState(user?.plan?.name || t("common.plan_default"));

  useEffect(() => {
    setPlanName(user?.plan?.name || t("common.plan_default"));
  }, [user, t]);

  // swipe mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    if (touchStartX.current - e.changedTouches[0].clientX > 80) {
      onClose?.();
    }
    touchStartX.current = null;
  };

  return (
    <>
      {/* BOTÃO DO CHAT – SEMPRE VISÍVEL */}
      {location.pathname === "/text-generation" && (
        <ChatToggleButton collapsed={collapsed} />
      )}

      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`
          fixed z-40
          h-full
          bg-white px-4
          flex flex-col justify-between
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-20" : "w-64"}
          ${isOpen ? "left-0" : "-left-full"}
          lg:left-0
        `}
        data-main-sidebar=""
      >
        <div className="flex-1 overflow-y-auto py-2">
          {!collapsed && (
            <img
              src="/static/artificiall/Artificiall_Cor_Hor_FundoClaro_RGB.png"
              alt="Logo"
              className="w-full px-2 py-6"
            />
          )}

          <nav className="space-y-2">
            {navItems.map(({ labelKey, icon: Icon, path }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={labelKey}
                  to={path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition
                    hover:bg-gray-100
                    ${isActive
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700"}
                  `}
                >
                  <Icon className="w-5 h-5 text-gray-600" />
                  {!collapsed && <span>{t(labelKey)}</span>}
                </Link>
              );
            })}

            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <ShieldCheck className="w-5 h-5 text-gray-600" />
                {!collapsed && <span>{t("admin.sidebar.link")}</span>}
              </Link>
            )}
          </nav>
        </div>

        <div className="border-t border-gray-300 py-4 text-sm">
          {!collapsed && (
            <div className="flex items-center justify-center">
              <span className="mr-2 text-gray-600">{t("common.plan")}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 shadow-sm">
                {planName}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
   
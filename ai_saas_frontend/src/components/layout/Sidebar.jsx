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
  ShieldCheck,
  Lock,
  Download,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useFeatureRestriction } from "../../hooks/useFeatureRestriction";
import { backendMessageKeyMap } from "../../i18n";
import UpgradeModal from "../common/UpgradeModal";

const getNavItems = (t) => [
  { label: t("sidebar.dashboard"), icon: LayoutDashboard, path: "/", feature: null },
  { label: t("sidebar.text_generation"), icon: FileText, path: "/text-generation", feature: "text_generation" },
  { label: t("sidebar.image_generation"), icon: Image, path: "/image-generation", feature: "image_generation" },
  { label: t("sidebar.video_generation"), icon: Video, path: "/video-generation", feature: "video_generation" },
  { label: t("sidebar.download_bot"), icon: Download, path: "/download-bot", feature: "download_bot" },
  { label: t("sidebar.subscription"), icon: CreditCard, path: "/subscription", feature: null },
  { label: t("sidebar.profile"), icon: User, path: "/profile", feature: null },
  { label: t("sidebar.settings"), icon: Settings, path: "/settings", feature: null }
];

/**
 * BOTÃO DO CHAT (AZUL + SUAVE + SEM PULO)
 * - Não usa setInterval
 * - Não usa state para mover (left) -> evita “teleporte”
 * - Move com requestAnimationFrame + transition de left
 */
function ChatToggleButton({ collapsed, t }) {
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);

  useEffect(() => {
    const btn = document.getElementById("chat-toggle-btn");
    const mainSidebar = document.querySelector('[data-main-sidebar]');
    const chatSidebar = document.querySelector('[data-chat-sidebar]');

    if (!btn || !mainSidebar) return;

    let raf = 0;

    const measure = () => {
      const mainW = mainSidebar.offsetWidth || 0;

      // width real (mesmo com translate)
      const chatW = Math.round(chatSidebar?.getBoundingClientRect?.().width || 0);
      const isOpen = chatW > 20;
      setChatSidebarOpen(isOpen);

      const left = mainW + (isOpen ? chatW : 0);

      // Atualiza direto no style => não dá pulo
      btn.style.left = `${Math.max(0, left - 6)}px`;
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    // inicial
    schedule();

    // observa mudanças de tamanho
    const ro = new ResizeObserver(schedule);
    ro.observe(mainSidebar);
    if (chatSidebar) ro.observe(chatSidebar);

    // observa troca de classe/style no chat sidebar (abre/fecha)
    const mo = new MutationObserver(schedule);
    if (chatSidebar) mo.observe(chatSidebar, { attributes: true, attributeFilter: ["class", "style"] });

    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [collapsed]);

  return createPortal(
    <button
      id="chat-toggle-btn"
      onClick={() => window.toggleChatSidebar?.()}
      title={t("sidebar.chat_toggle")}
      aria-label={t("sidebar.chat_toggle")}
      className={`
        hidden md:flex
        fixed z-[60]
        top-1/2 -translate-y-1/2

        h-16 w-9 items-center justify-center
        rounded-r-xl rounded-l-none

        bg-blue-600 text-white
        shadow-lg ring-1 ring-black/10

        transition-[left,transform,background,box-shadow] duration-300
        ease-[cubic-bezier(.4,0,.2,1)]
        hover:bg-blue-700 hover:shadow-xl
        active:scale-[0.98]
      `}
      style={{
        left: 0,
        willChange: "left",
      }}
    >
      <span
        className={`
          text-xl leading-none select-none
          transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
          ${chatSidebarOpen ? "rotate-180" : ""}
        `}
      >
        ‹
      </span>
    </button>,
    document.body
  );
}

export default function Sidebar({ collapsed = false, isOpen = false, onClose }) {
  const { t } = useLanguage();
  const location = useLocation();
  const { user } = useAuth();
  const { hasFeatureAccess, upgradeModal, closeUpgradeModal, showUpgradeModal } = useFeatureRestriction();
  const touchStartX = useRef(null);
  const [planName, setPlanName] = useState(user?.plan?.name || t("common.plan_default"));
  const navItems = getNavItems(t);

  const translatePlanName = (planName) => {
    if (!planName) return t("common.plan_default");
    const translationKey = backendMessageKeyMap[planName];
    return translationKey ? t(translationKey) : planName;
  };

  useEffect(() => {
    setPlanName(user?.plan?.name || t("common.plan_default"));
  }, [user, t]);

  // swipe mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    if (touchStartX.current - e.changedTouches[0].clientX > 80) onClose?.();
    touchStartX.current = null;
  };

  return (
    <>
      {/* BOTÃO DO CHAT – APENAS NA ROTA DO CHAT */}
      {location.pathname === "/text-generation" && (
        <ChatToggleButton collapsed={collapsed} t={t} />
      )}

      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`
          fixed z-40 h-full top-0 bottom-0
          bg-white px-4 flex flex-col justify-between
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
            {navItems.map(({ label, icon: Icon, path, feature }) => {
              const isActive = location.pathname === path;
              const hasAccess = !feature || hasFeatureAccess(feature);

              return (
                <div key={label}>
                  {feature && !hasAccess ? (
                    <div
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg cursor-not-allowed
                        ${isActive ? "bg-gray-100 text-gray-400" : "text-gray-400"}
                      `}
                      title={`${label} - Não disponível no seu plano`}
                      onClick={() => showUpgradeModal(feature)}
                    >
                      <div className="relative">
                        <Icon className="w-5 h-5" />
                        <Lock className="w-3 h-3 absolute -bottom-1 -right-1 text-red-500" />
                      </div>
                      {!collapsed && <span className="text-sm">{label}</span>}
                    </div>
                  ) : (
                    <Link
                      to={path}
                      onClick={onClose}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg
                        transition hover:bg-gray-100
                        ${isActive ? "bg-gray-200 text-gray-900" : "text-gray-700"}
                      `}
                    >
                      <Icon className="w-5 h-5 text-gray-600" />
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  )}
                </div>
              );
            })}

            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <ShieldCheck className="w-5 h-5 text-gray-600" />
                {!collapsed && <span>{t('admin.sidebar.link')}</span>}
              </Link>
            )}
          </nav>
        </div>

        <div className="border-t border-gray-300 py-4 text-sm">
          {!collapsed && (
            <div className="flex items-center justify-center">
              <span className="mr-2 text-gray-600">{t('common.plan')}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 shadow-sm">
                {translatePlanName(planName)}
              </span>
            </div>
          )}
        </div>
      </aside>

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={closeUpgradeModal}
        title={upgradeModal.title}
        description={upgradeModal.description}
        feature={upgradeModal.feature}
      />
    </>
  );
}

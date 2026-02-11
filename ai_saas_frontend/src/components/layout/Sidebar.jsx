import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  FileText,
  Image,
  Video,
  Building2,
  ChevronDown,
  ChevronRight,
  Search,
  FolderKanban,
  CheckSquare,
  Plug,
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

const getProEmpresaParent = (t) => ({
  label: t("sidebar.pro_empresa"),
  icon: Building2,
  path: "/pro-empresa",
  feature: "pro_empresa",
});

const getProEmpresaChildren = (t) => [
  { label: t("sidebar.pro_empresa.seo"), icon: Search, path: "/pro-empresa/seo", feature: "seo_keyword_research" },
  { label: t("sidebar.pro_empresa.workspaces"), icon: FolderKanban, path: "/pro-empresa/workspaces", feature: "collab_workspaces" },
  { label: t("sidebar.pro_empresa.approvals"), icon: CheckSquare, path: "/pro-empresa/approvals", feature: "collab_approval_flow" },
  { label: t("sidebar.pro_empresa.integrations"), icon: Plug, path: "/pro-empresa/integrations", feature: "cms_integration_wordpress" },
];

function ChatToggleButton({ collapsed, t }) {
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [leftPos, setLeftPos] = useState(0);

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
        <path d="M5 4 L19 12 L5 20 Z" className="fill-black" />
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
  const { t } = useLanguage();
  const location = useLocation();
  const { user } = useAuth();
  const { hasFeatureAccess, upgradeModal, closeUpgradeModal, showUpgradeModal } = useFeatureRestriction();
  const touchStartX = useRef(null);
  const [planName, setPlanName] = useState(user?.plan?.name || t("common.plan_default"));
  const navItems = getNavItems(t);
  const proEmpresaParent = getProEmpresaParent(t);
  const proEmpresaChildren = getProEmpresaChildren(t);
  const [proEmpresaOpen, setProEmpresaOpen] = useState(location.pathname.startsWith("/pro-empresa"));

  const translatePlanName = (planName) => {
    if (!planName) return t("common.plan_default");
    const translationKey = backendMessageKeyMap[planName];
    return translationKey ? t(translationKey) : planName;
  };

  useEffect(() => {
    setPlanName(user?.plan?.name || t("common.plan_default"));
  }, [user]);

  // Se navegar para uma rota /pro-empresa*, abre o dropdown automaticamente
  useEffect(() => {
    if (location.pathname.startsWith("/pro-empresa")) {
      setProEmpresaOpen(true);
    }
  }, [location.pathname]);

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
        <ChatToggleButton collapsed={collapsed} t={t} />
      )}

      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`
          fixed z-40
          h-full
          top-0 bottom-0
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
            {navItems.map(({ label, icon: Icon, path, feature }) => {
              const isActive = location.pathname === path;
              const hasAccess = !feature || hasFeatureAccess(feature);
              
              return (
                <div key={label}>
                  {feature && !hasAccess ? (
                    // Item bloqueado - mostra como desabilitado com ícone de cadeado
                    <div
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg cursor-not-allowed
                        ${isActive
                          ? "bg-gray-100 text-gray-400"
                          : "text-gray-400"}
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
                    // Item normal ou sem restrição
                    <Link
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
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  )}
                </div>
              );
            })}

            <>
              <div className="my-3 border-t border-gray-200" />
              {!collapsed && (
                <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("sidebar.pro_empresa")}
                </div>
              )}

              {/* Parent (toggle dropdown) */}
              <div>
                {proEmpresaParent.feature && !hasFeatureAccess(proEmpresaParent.feature) ? (
                  <div
                    className={`
                      flex items-center justify-between gap-3 px-4 py-3 rounded-lg cursor-not-allowed
                      ${location.pathname.startsWith("/pro-empresa") ? "bg-gray-100 text-gray-400" : "text-gray-400"}
                    `}
                    title={`${proEmpresaParent.label} - Não disponível no seu plano`}
                    onClick={() => showUpgradeModal(proEmpresaParent.feature)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Building2 className="w-5 h-5" />
                        <Lock className="w-3 h-3 absolute -bottom-1 -right-1 text-red-500" />
                      </div>
                      {!collapsed && <span className="text-sm">{proEmpresaParent.label}</span>}
                    </div>
                    {!collapsed && <ChevronRight className="w-4 h-4 opacity-60" />}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setProEmpresaOpen((v) => !v)}
                    className={`
                      w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg
                      transition hover:bg-gray-100
                      ${location.pathname.startsWith("/pro-empresa") ? "bg-gray-200 text-gray-900" : "text-gray-700"}
                    `}
                    title={proEmpresaParent.label}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      {!collapsed && <span>{proEmpresaParent.label}</span>}
                    </div>
                    {!collapsed && (
                      proEmpresaOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )
                    )}
                  </button>
                )}

                {/* Children (dropdown) */}
                {proEmpresaOpen && (
                  <div className="mt-1 space-y-1">
                    {proEmpresaChildren.map(({ label, icon: Icon, path, feature }) => {
                      const isActive = location.pathname === path;
                      const hasAccess = !feature || hasFeatureAccess(feature);

                      const baseClass = `
                        flex items-center justify-between gap-3 rounded-lg
                        transition hover:bg-gray-100
                        ${isActive ? "bg-gray-200 text-gray-900" : "text-gray-700"}
                      `;

                      // Indent when expanded (desktop). When collapsed, keep icon-only child rows usable.
                      const paddingClass = collapsed ? "px-4 py-3" : "px-4 py-2 ml-6";

                      if (feature && !hasAccess) {
                        return (
                          <div
                            key={label}
                            className={`${baseClass} ${paddingClass} cursor-not-allowed text-gray-400 hover:bg-transparent`}
                            title={`${label} - Não disponível no seu plano`}
                            onClick={() => showUpgradeModal(feature)}
                          >
                            <div className="flex items-center gap-3">
                              {collapsed ? (
                                <div className="relative">
                                  <Icon className="w-5 h-5" />
                                  <Lock className="w-3 h-3 absolute -bottom-1 -right-1 text-red-500" />
                                </div>
                              ) : (
                                <span className="text-sm">{label}</span>
                              )}
                            </div>
                            {!collapsed && <Lock className="w-4 h-4 text-red-500" />}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={label}
                          to={path}
                          onClick={onClose}
                          className={`${baseClass} ${paddingClass}`}
                          title={label}
                        >
                          <div className="flex items-center gap-3">
                            {collapsed ? (
                              <Icon className="w-5 h-5 text-gray-600" />
                            ) : (
                              <span className="text-sm">{label}</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </>

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

      {/* Upgrade Modal */}
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
   
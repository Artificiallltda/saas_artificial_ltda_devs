import { useEffect, useState, useRef } from "react";
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

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },

  // Esses 3 ficam mais escuros no LIGHT
  { label: "Geração de Texto", icon: FileText, path: "/text-generation", strong: true },
  { label: "Geração de Imagem", icon: Image, path: "/image-generation", strong: true },
  { label: "Geração de Vídeo", icon: Video, path: "/video-generation", strong: true },

  { label: "Assinatura", icon: CreditCard, path: "/subscription" },
  { label: "Perfil", icon: User, path: "/profile" },
  { label: "Configurações", icon: Settings, path: "/settings" }
];

export default function Sidebar({ collapsed = false, isOpen = false, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const touchStartX = useRef(null);
  const [planName, setPlanName] = useState(user?.plan?.name || "Inicial");

  useEffect(() => {
    setPlanName(user?.plan?.name || "Inicial");
  }, [user]);

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
    <aside
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`
        px-4
        flex flex-col justify-between
        transition-[width,transform] duration-300 ease-in-out

        bg-[var(--surface)] text-[var(--text)]
        border-r border-[var(--border)]

        relative
        ${collapsed ? "w-20" : "w-64"}

        fixed inset-y-0 left-0 z-50 lg:relative
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
    >
      <div>
        {/* LOGO light/dark */}
        {!collapsed && (
          <div className="px-2 py-6">
            <img
              src="/static/artificiall/Artificiall_Cor_Hor_FundoClaro_RGB.png"
              alt="Logo"
              className="w-full block dark:hidden artificiall-logo"
            />
            <img
              src="/static/artificiall/white_Hor_RGB.png"
              alt="Logo"
              className="w-full hidden dark:block artificiall-logo"
            />
          </div>
        )}

        <nav className="space-y-2">
          {navItems.map(({ label, icon: Icon, path, strong }) => {
            const isActive =
              location.pathname === path ||
              (path !== "/" && location.pathname.startsWith(path));

            const baseText = strong ? "text-[var(--text)]" : "text-[var(--text-muted)]";
            const baseIcon = strong ? "text-[var(--icon)]" : "text-[var(--icon-muted)]";

            return (
              <Link
                key={label}
                to={path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition
                  hover:bg-[var(--surface-2)]
                  ${baseText} hover:text-[var(--text)]
                  ${isActive ? "bg-[var(--surface-2)] text-[var(--text)]" : ""}
                `}
              >
                <Icon
                  className={`
                    w-5 h-5
                    ${isActive ? "text-[var(--icon)]" : baseIcon}
                  `}
                />
                {!collapsed && <span className="text-sm">{label}</span>}
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <Link
              to="/admin"
              onClick={onClose}
              className="
                flex items-center gap-3 px-4 py-3 rounded-lg transition
                text-[var(--text-muted)] hover:text-[var(--text)]
                hover:bg-[var(--surface-2)]
              "
            >
              <ShieldCheck className="w-5 h-5 text-[var(--icon-muted)]" />
              {!collapsed && <span className="text-sm">Painel Administrativo</span>}
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t border-[var(--border)] py-4 text-sm">
        {!collapsed && (
          <div className="flex items-center justify-center">
            <span className="mr-2 text-[var(--text-muted)]">Plano</span>

            <span
              className="
                inline-flex items-center px-2.5 py-0.5 rounded-full
                bg-[var(--surface-2)]
                text-[var(--text)]
                border border-[var(--border)]
                shadow-sm
              "
            >
              {planName}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

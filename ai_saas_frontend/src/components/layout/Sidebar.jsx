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
  { label: "Geração de Texto", icon: FileText, path: "/text-generation" },
  { label: "Geração de Imagem", icon: Image, path: "/image-generation" },
  { label: "Geração de Vídeo", icon: Video, path: "/video-generation" },
  { label: "Assinatura", icon: CreditCard, path: "/subscription" },
  { label: "Perfil", icon: User, path: "/profile" },
  { label: "Configurações", icon: Settings, path: "/settings" }
];

export default function Sidebar({
  collapsed = false,
  isOpen = false,
  onClose
}) {
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
    if (touchStartX.current - e.changedTouches[0].clientX > 80) {
      onClose?.();
    }
    touchStartX.current = null;
  };

  return (
    <aside
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`
        bg-white px-4
        flex flex-col justify-between
        transition-[width,transform] duration-300 ease-in-out
        h-full
        ${collapsed ? "w-20" : "w-64"}
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
    >
      <div className="flex-1 overflow-y-auto py-2">
        {!collapsed && (
          <img
            src="/static/artificiall/dark_Hor_RGB.png"
            alt="Logo"
            className="w-full px-2 py-6"
          />
        )}

        <nav className="space-y-2">
          {navItems.map(({ label, icon: Icon, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={label}
                to={path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  hover:bg-gray-100 transition
                  ${isActive ? "bg-gray-200 text-gray-900" : "text-gray-700"}
                `}
              >
                <Icon className="w-5 h-5 text-gray-600" />
                {!collapsed && (
                  <span className="text-gray-700">{label}</span>
                )}
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
              {!collapsed && (
                <span className="text-gray-700">
                  Painel Administrativo
                </span>
              )}
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t border-gray-300 py-4 text-sm">
  {!collapsed && (
    <div className="flex items-center justify-center">
          <span className="mr-2 text-gray-600">Plano</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 shadow-sm">
            {planName}
          </span>
        </div>
      )}
    </div>
    </aside>
  );
}

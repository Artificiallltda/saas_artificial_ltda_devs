import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Image,
  Video,
  CreditCard,
  User,
  Settings,
  ShieldCheck,
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
  { label: "Configurações", icon: Settings, path: "/settings" },
];

export default function Sidebar({ collapsed = false }) {
  const location = useLocation();
  const { user } = useAuth();

  const [planName, setPlanName] = useState(() => {
    return user?.plan?.name || "Inicial";
  });

  useEffect(() => {
    if (user?.plan?.name) {
      setPlanName(user.plan.name);
    } else {
      setPlanName("Inicial");
    }
  }, [user]);

  return (
    <aside
      className={`${
        collapsed ? "w-20 -ml-64" : "w-64 ml-0"
      } bg-primary px-4 h-screen flex flex-col transition-all duration-300`}
    >
      {/* TOPO */}
      <div>
        {!collapsed && (
          <img
            src="/static/artificiall/white_Hor_RGB.png"
            alt="Logo"
            className="w-64 h-auto px-2 py-6"
          />
        )}

        <nav className="space-y-2">
          {navItems.map(({ label, icon: Icon, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={label}
                to={path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition ${
                  isActive ? "bg-primary-dark/40 text-white" : ""
                }`}
              >
                <Icon className="w-5 h-5 text-white/90" />
                {!collapsed && (
                  <span className="text-base font-normal text-white/90">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
            >
              <ShieldCheck className="w-5 h-5 text-white/90" />
              {!collapsed && (
                <span className="text-base font-normal text-white/90">
                  Painel Administrativo
                </span>
              )}
            </Link>
          )}
        </nav>
      </div>

      {/* PLANO DO USUÁRIO (DESTAQUE - FUNDO BRANCO / TEXTO AZUL) */}
      {!collapsed && (
        <div className="mt-auto mb-4 flex justify-center">
          <div className="relative px-4 py-2 rounded-full bg-white text-sm font-medium text-blue-600 overflow-hidden border border-blue-200 shadow-sm">
            {/* Animação sutil na borda (glow) */}
            <div className="absolute inset-0 rounded-full pointer-events-none animate-border" />

            {/* Texto */}
            <span className="relative z-10">
              Plano <span className="font-semibold">{planName}</span>
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

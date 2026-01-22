import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop
  const location = useLocation();

  const isTextGeneration = location.pathname.startsWith("/text-generation");

  // Fecha drawer ao virar desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ESC fecha drawer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // trava scroll só no mobile drawer
  useEffect(() => {
    if (!isTextGeneration && sidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => (document.body.style.overflow = "");
  }, [sidebarOpen, isTextGeneration]);

  return (
    <div
      className={`flex ${
        isTextGeneration ? "min-h-screen" : "h-screen overflow-hidden"
      }`}
    >
      {/* OVERLAY MOBILE */}
      {!isTextGeneration && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR (NUNCA FIXO NO TEXT-GENERATION) */}
      <div
        className={`
          bg-primary
          transition-[width] duration-300 ease-in-out
          ${sidebarCollapsed ? "w-20" : "w-64"}

          ${
            isTextGeneration
              ? "relative"
              : "fixed lg:relative z-50"
          }

          ${
            !isTextGeneration && !sidebarOpen
              ? "-translate-x-full lg:translate-x-0"
              : "translate-x-0"
          }
        `}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          isOpen={!isTextGeneration && sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* CONTEÚDO */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={() => {
            if (!isTextGeneration) {
              setSidebarOpen((v) => !v);
            }
          }}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main
          className={`
            flex-1 bg-gray-light
            ${isTextGeneration ? "overflow-visible p-0" : "overflow-auto p-6"}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

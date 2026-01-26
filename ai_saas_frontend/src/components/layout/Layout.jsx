import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children, mainSidebarCollapsed }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(mainSidebarCollapsed || false); // desktop
  const location = useLocation();

  const isTextGeneration = location.pathname.startsWith("/text-generation");

  // Usar mainSidebarCollapsed se fornecido
  useEffect(() => {
    if (mainSidebarCollapsed !== undefined) {
      setSidebarCollapsed(mainSidebarCollapsed);
    }
  }, [mainSidebarCollapsed]);

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

  // Expor controles globais para o mobile (usado em text-generation)
  useEffect(() => {
    window.openMainSidebar = () => setSidebarOpen(true);
    window.closeMainSidebar = () => setSidebarOpen(false);
    window.toggleMainSidebar = () => setSidebarOpen(v => !v);
    return () => {
      delete window.openMainSidebar;
      delete window.closeMainSidebar;
      delete window.toggleMainSidebar;
    };
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
    <div className="flex min-h-screen w-full">
      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR PRINCIPAL */}
      <div
        className={`
          bg-white
          transition-[width] duration-300 ease-in-out
          ${sidebarCollapsed ? "w-20" : "w-64"}
          fixed lg:relative z-50 h-screen overflow-y-auto
          ${!sidebarOpen ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}
        `}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* CONTEÚDO */}
      <div className="flex-1 flex flex-col w-full">
        <Header
          onMenuClick={() =>
            setSidebarOpen((v) => {
              const next = !v;
              if (next && isTextGeneration) {
                window.closeChatSidebar?.();
              }
              return next;
            })
          }
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          sidebarCollapsed={sidebarCollapsed}
          isTextGeneration={isTextGeneration}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 w-full">
          <div className="w-full h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
// src/components/layout/Layout.jsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children, mainSidebarCollapsed }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop
  const location = useLocation();

  const isTextGeneration = location.pathname.startsWith("/text-generation");

  // Fecha drawer ao virar desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
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

  // trava scroll só no mobile drawer (menos no text-generation)
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
      style={{
        background: "var(--bg)",   // LIGHT: branco | DARK: escuro
        color: "var(--text)",
      }}
    >
      {/* OVERLAY MOBILE */}
      {!isTextGeneration && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ background: "rgba(0,0,0,0.40)" }}
        />
      )}

      {/* SIDEBAR CONTAINER (não usa bg-primary!) */}
      <div
        className={`
          transition-[width,transform] duration-300 ease-in-out
          ${sidebarCollapsed ? "w-20" : "w-64"}
          ${isTextGeneration ? "relative" : "fixed lg:relative z-50"}
          ${
            !isTextGeneration && !sidebarOpen
              ? "-translate-x-full lg:translate-x-0"
              : "translate-x-0"
          }
        `}
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          isOpen={!isTextGeneration && sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={() => {
            if (!isTextGeneration) setSidebarOpen((v) => !v);
          }}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          sidebarCollapsed={sidebarCollapsed}
          mainSidebarCollapsed={mainSidebarCollapsed}
          isTextGeneration={isTextGeneration}
        />

        <main
          className={isTextGeneration ? "overflow-visible p-0" : "overflow-auto p-6"}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

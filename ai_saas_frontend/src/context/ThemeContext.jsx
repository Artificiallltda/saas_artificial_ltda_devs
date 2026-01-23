import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "saas-theme"; // "light" | "dark"
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
});

useEffect(() => {
    const root = document.documentElement;

    // ✅ BLINDADO: sempre remove antes, pra não "travar" no dark
    root.classList.remove("dark");
    if (theme === "dark") root.classList.add("dark");

        // Sincroniza atributo data-theme para as regras de CSS variables
        try {
            root.setAttribute("data-theme", theme);
        } catch {}

    // ✅ salva sempre no mesmo lugar
    localStorage.setItem(STORAGE_KEY, theme);

    // ✅ remove chaves antigas pra não dar conflito (opcional, mas ajuda muito)
    try {
    localStorage.removeItem("theme");
    } catch {}
}, [theme]);

const value = useMemo(() => {
    const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    return { theme, setTheme, toggleTheme };
}, [theme]);

return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
const ctx = useContext(ThemeContext);
if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
return ctx;
}
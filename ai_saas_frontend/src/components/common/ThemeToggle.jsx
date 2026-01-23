import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className={
        `inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors
        bg-[var(--button-bg)] text-[var(--button-text)] border border-[var(--border)]
        hover:brightness-95 focus:outline-none`
      }
      style={{ boxShadow: "var(--focus-ring)" }}
    >
      {theme === "dark" ? "☀" : "🌙"}
    </button>
  );
}
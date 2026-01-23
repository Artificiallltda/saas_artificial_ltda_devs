import { X } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  title,
  description,
  children,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
      <div
        className="
          relative w-full max-w-md rounded-xl p-9 shadow-xl
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-800
          text-neutral-900 dark:text-neutral-100
        "
      >
        <button
          className="
            absolute top-3 right-3 p-1.5 rounded-full
            hover:bg-gray-100 dark:hover:bg-neutral-800
            transition
          "
          onClick={onClose}
          aria-label="Fechar"
          type="button"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
        </button>

        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {description && (
          <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4 mt-4">
            {description}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
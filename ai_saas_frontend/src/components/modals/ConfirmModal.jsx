import { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  loading = false,
  variant = "primary", // primary | danger
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 disabled:opacity-50"
      : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 sm:p-8 w-full max-w-md shadow-lg relative border border-gray-100 dark:border-gray-800">
        <button
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        </button>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <AlertTriangle className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
          </div>
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="py-2 px-4 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`py-2 px-4 rounded text-white text-sm ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


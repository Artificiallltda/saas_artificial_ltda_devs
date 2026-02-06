import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function BotPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {isOpen ? (
        <div className="w-[90vw] max-w-sm h-[70vh] max-h-[520px] bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-gray-800">{t("bot_popup.title")}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label={t("bot_popup.close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto text-sm text-gray-600">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {t("bot_popup.coming_soon_message")}
            </div>

            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                {t("bot_popup.category_label")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-medium shadow-sm hover:bg-gray-50"
                >
                  {t("bot_popup.category.complaint")}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-medium shadow-sm hover:bg-gray-50"
                >
                  {t("bot_popup.category.support")}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-medium shadow-sm hover:bg-gray-50"
                >
                  {t("bot_popup.category.sales")}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-medium shadow-sm hover:bg-gray-50"
                >
                  {t("bot_popup.category.billing")}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled
                placeholder={t("bot_popup.input_placeholder")}
                className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-sm text-gray-600 bg-gray-100 cursor-not-allowed"
              />
              <button
                type="button"
                disabled
                className="h-10 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium opacity-50 cursor-not-allowed"
              >
                {t("bot_popup.send")}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">{t("bot_popup.coming_soon")}</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
          aria-label={t("bot_popup.open")}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{t("bot_popup.button_label")}</span>
        </button>
      )}
    </div>
  );
}

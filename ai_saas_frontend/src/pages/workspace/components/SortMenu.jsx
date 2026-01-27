import React, { useRef, useEffect } from "react";
import { ArrowUpDown } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

export default function SortMenu({ activeTab, sortBy, setSortBy }) {
  const { t } = useLanguage();
  const sortRef = useRef(null);
  const [sortMenuOpen, setSortMenuOpen] = React.useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={sortRef}>
      <button
        onClick={() => setSortMenuOpen(!sortMenuOpen)}
        className="p-2 rounded-md hover:bg-gray-100 transition"
      >
        <ArrowUpDown className="w-5 h-5 text-gray-700" />
      </button>

      {sortMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden text-sm z-50">
          <button
            onClick={() => {
              setSortBy("newest");
              setSortMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            {t("sort.newest")}
          </button>
          <button
            onClick={() => {
              setSortBy("oldest");
              setSortMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            {t("sort.oldest")}
          </button>
          <button
            onClick={() => {
              setSortBy("name");
              setSortMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            {t("sort.name")}
          </button>

          {/* Só mostra "Por modelo" e "Por duração" se NÃO for nem "project" nem "notifications" */}
          {activeTab !== "project" && activeTab !== "notifications" && (
            <>
              <button
                onClick={() => {
                  setSortBy("model");
                  setSortMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                {t("sort.model")}
              </button>
              {activeTab === "video" && (
                <button
                  onClick={() => {
                    setSortBy("duration");
                    setSortMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  {t("sort.duration")}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
import React, { useRef, useEffect } from "react";
import { Filter } from "lucide-react";
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  IMAGE_STYLES,
  VIDEO_RATIOS,
  IMAGE_RATIOS,
} from "../../../utils/constants";
import { useLanguage } from "../../../context/LanguageContext";

export default function FiltersPanel({
  activeTab,
  dateFilter,
  setDateFilter,

  filterReadStatus,      // Novo filtro para notificações
  setFilterReadStatus,   // Setter

  filterModel,
  setFilterModel,
  filterStyle,
  setFilterStyle,
  filterRatio,
  setFilterRatio,
  filterTempMin,
  setFilterTempMin,
  filterTempMax,
  setFilterTempMax,
  filterDurMin,
  setFilterDurMin,
  filterDurMax,
  setFilterDurMax,
}) {
  const { t } = useLanguage();
  const filterRef = useRef(null);
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

  const getStyleLabel = (value) => {
    const key = `generation.image.styles.${value}`;
    const translated = t(key);
    return translated === key ? value : translated;
  };

  const getImageRatioLabel = (value) => {
    const ratioKeyByValue = {
      "1024x1024": "generation.image.ratios.square",
      "1536x1024": "generation.image.ratios.landscape",
      "1024x1536": "generation.image.ratios.portrait",
    };
    const key = ratioKeyByValue[value];
    if (!key) return value;
    return t(key);
  };

  const getVideoRatioLabel = (value) => {
    const ratioKeyByValue = {
      "16:9": "generation.video.ratios.landscape",
      "9:16": "generation.video.ratios.portrait",
    };
    const key = ratioKeyByValue[value];
    if (!key) return value;
    return t(key);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={filterRef}>
      <button
        onClick={() => setFilterMenuOpen(!filterMenuOpen)}
        className="p-2 rounded-md hover:bg-gray-100 transition"
      >
        <Filter className="w-5 h-5 text-gray-700" />
      </button>

      {filterMenuOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-50 animate-fadeIn">
          <h3 className="text-sm font-semibold mb-2">{t("filters.advanced")}</h3>

          {/* FILTRO DATA */}
          <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.date.label")}</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
          >
            <option value="">{t("filters.common.all")}</option>
            <option value="7days">{t("filters.date.last_7_days")}</option>
            <option value="30days">{t("filters.date.last_30_days")}</option>
          </select>

          {/* FILTRO LEITURA - APENAS NA TELA DE NOTIFICAÇÕES */}
          {activeTab === "notifications" && (
            <>
              <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.read_status.label")}</label>
              <select
                value={filterReadStatus}
                onChange={(e) => setFilterReadStatus(e.target.value)}
                className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
              >
                <option value="">{t("filters.common.all")}</option>
                <option value="read">{t("filters.read_status.read")}</option>
                <option value="unread">{t("filters.read_status.unread")}</option>
              </select>
            </>
          )}

          {/* OS DEMAIS FILTROS SÓ APARECEM SE NÃO FOR A TELA DE NOTIFICAÇÕES E SE ACTIVE TAB FOR DIFERENTE DE "project" */}
          {activeTab !== "notifications" && activeTab !== "project" && (
            <>
              {/* FILTRO MODELO */}
              <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.model")}</label>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
              >
                <option value="">{t("filters.common.all")}</option>
                {(activeTab === "text"
                  ? TEXT_MODELS
                  : activeTab === "image"
                  ? IMAGE_MODELS
                  : VIDEO_MODELS
                ).map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {/* FILTRO ESTILO */}
              {(activeTab === "image" || activeTab === "video") && (
                <>
                  <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.style")}</label>
                  <select
                    value={filterStyle}
                    onChange={(e) => setFilterStyle(e.target.value)}
                    className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
                  >
                    <option value="">{t("filters.common.all")}</option>
                    {(activeTab === "image" ? IMAGE_STYLES : VIDEO_RATIOS).map(({ value }) => (
                      <option key={value} value={value}>
                        {activeTab === "image" ? getStyleLabel(value) : getVideoRatioLabel(value)}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* FILTRO PROPORÇÃO */}
              {activeTab === "image" && (
                <>
                  <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.ratio")}</label>
                  <select
                    value={filterRatio}
                    onChange={(e) => setFilterRatio(e.target.value)}
                    className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
                  >
                    <option value="">{t("filters.common.all")}</option>
                    {IMAGE_RATIOS.map(({ value }) => (
                      <option key={value} value={value}>
                        {getImageRatioLabel(value)}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* FILTROS DE TEMPERATURA - SOMENTE TEXT */}
              {activeTab === "text" && (
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.temp_min")}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={filterTempMin}
                      onChange={(e) => setFilterTempMin(e.target.value)}
                      className="w-full text-sm bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.temp_max")}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={filterTempMax}
                      onChange={(e) => setFilterTempMax(e.target.value)}
                      className="w-full text-sm bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md"
                    />
                  </div>
                </div>
              )}

              {/* FILTROS DE DURAÇÃO - SOMENTE VIDEO */}
              {activeTab === "video" && (
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.duration_min")}</label>
                    <input
                      type="number"
                      value={filterDurMin}
                      onChange={(e) => setFilterDurMin(e.target.value)}
                      className="w-full text-sm bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1 mt-2">{t("filters.duration_max")}</label>
                    <input
                      type="number"
                      value={filterDurMax}
                      onChange={(e) => setFilterDurMax(e.target.value)}
                      className="w-full text-sm bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={() => {
              setFilterModel("");
              setFilterStyle("");
              setFilterRatio("");
              setFilterTempMin("");
              setFilterTempMax("");
              setFilterDurMin("");
              setFilterDurMax("");
              setDateFilter("");
              setFilterReadStatus && setFilterReadStatus(""); // limpar filtro leitura também se existir
            }}
            className="w-full text-xs text-gray-600 hover:underline mt-4"
          >
            {t("filters.clear")}
          </button>
        </div>
      )}
    </div>
  );
}
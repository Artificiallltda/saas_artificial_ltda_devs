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
  const filterRef = useRef(null);
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

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
          <h3 className="text-sm font-semibold mb-2">Filtros Avançados</h3>

          {/* FILTRO DATA */}
          <label className="block text-xs text-gray-600 mb-1 mt-2">Data</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
          >
            <option value="">Todas</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
          </select>

          {/* FILTRO LEITURA - APENAS NA TELA DE NOTIFICAÇÕES */}
          {activeTab === "notifications" && (
            <>
              <label className="block text-xs text-gray-600 mb-1 mt-2">Status de leitura</label>
              <select
                value={filterReadStatus}
                onChange={(e) => setFilterReadStatus(e.target.value)}
                className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
              >
                <option value="">Todos</option>
                <option value="read">Somente lidos</option>
                <option value="unread">Somente não lidos</option>
              </select>
            </>
          )}

          {/* OS DEMAIS FILTROS SÓ APARECEM SE NÃO FOR A TELA DE NOTIFICAÇÕES E SE ACTIVE TAB FOR DIFERENTE DE "project" */}
          {activeTab !== "notifications" && activeTab !== "project" && (
            <>
              {/* FILTRO MODELO */}
              <label className="block text-xs text-gray-600 mb-1 mt-2">Modelo</label>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
              >
                <option value="">Todos</option>
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
                  <label className="block text-xs text-gray-600 mb-1 mt-2">Estilo</label>
                  <select
                    value={filterStyle}
                    onChange={(e) => setFilterStyle(e.target.value)}
                    className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
                  >
                    <option value="">Todos</option>
                    {(activeTab === "image" ? IMAGE_STYLES : VIDEO_RATIOS).map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* FILTRO PROPORÇÃO */}
              {activeTab === "image" && (
                <>
                  <label className="block text-xs text-gray-600 mb-1 mt-2">Proporção</label>
                  <select
                    value={filterRatio}
                    onChange={(e) => setFilterRatio(e.target.value)}
                    className="bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md text-black"
                  >
                    <option value="">Todas</option>
                    {IMAGE_RATIOS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* FILTROS DE TEMPERATURA - SOMENTE TEXT */}
              {activeTab === "text" && (
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1 mt-2">Temp Min</label>
                    <input
                      type="number"
                      step="0.1"
                      value={filterTempMin}
                      onChange={(e) => setFilterTempMin(e.target.value)}
                      className="w-full text-sm bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1 mt-2">Temp Max</label>
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
                    <label className="block text-xs text-gray-600 mb-1 mt-2">Duração Mín</label>
                    <input
                      type="number"
                      value={filterDurMin}
                      onChange={(e) => setFilterDurMin(e.target.value)}
                      className="w-full text-sm bg-gray-50 rounded px-2 py-1 shadow-sm focus:outline-none focus:shadow-md"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1 mt-2">Duração Máx</label>
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
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );
}

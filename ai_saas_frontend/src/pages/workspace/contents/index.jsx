import { useState } from "react";
import Layout from "../../../components/layout/Layout";
import FiltersPanel from "../components/FiltersPanel";
import SortMenu from "../components/SortMenu";
import ContentCard from "../components/ContentCard";
import ContentDetailsModal from "../components/ContentDetailsModal.jsx";
import useContentsFetch from "../hooks/useContentsFetch";
import useFilters from "../hooks/useFilters";
import { Trash2 } from "lucide-react";
import { generatedContentRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService";
import { toast } from "react-toastify";
import useSelectionMode from "../hooks/useSelectionMode";
import SelectionToggleButton from "../components/SelectionToggleButton";
import SelectionToolbar from "../components/SelectionToolbar";
import { useLanguage } from "../../../context/LanguageContext";

export default function GeneratedContentsList() {
  const { t } = useLanguage();
  const { loading, allContents, setAllContents, handleDeleteContent } = useContentsFetch();
  const {
    filteredContents,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    filterProps,
    sortProps
  } = useFilters(allContents);

  const [selectedContent, setSelectedContent] = useState(null);

  const {
    selectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleSelect,
    clearSelection
  } = useSelectionMode();

  async function handleDeleteSelected() {
    if (selectedItems.length === 0) return;
    if (!confirm(t("contents.delete_selected.confirm", { count: selectedItems.length }))) return;

    const ids = selectedItems.map((c) => c.id);
    try {
      await apiFetch(generatedContentRoutes.deleteBatch, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" }
      });

      toast.success(t("contents.delete_selected.success", { count: selectedItems.length }));
      setAllContents((prev) => prev.filter((c) => !ids.includes(c.id)));
      clearSelection();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Layout>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{t("contents.title")}</h1>
          <p className="text-gray-600 mb-6">{t("contents.subtitle")}</p>
        </div>
      </div>

      <div className="flex space-x-6 border-b border-gray-300 mb-4 text-sm font-semibold">
        {["text", "image", "video"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 text-sm font-semibold transition ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            {t(`contents.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <input
          type="search"
          placeholder={t("contents.search.placeholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md pl-3 py-2 bg-white rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
        />

        <div className="flex gap-3">
          <SelectionToggleButton
            selectionMode={selectionMode}
            onToggle={toggleSelectionMode}
          />
          <FiltersPanel {...filterProps} activeTab={activeTab} />
          <SortMenu {...sortProps} activeTab={activeTab} />
        </div>
      </div>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : filteredContents.length === 0 ? (
        <p className="text-gray-500">{t("contents.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredContents.map((c) => (
            <ContentCard
              key={c.id}
              content={c}
              onSelect={setSelectedContent}
              onDelete={handleDeleteContent}
              selectionMode={selectionMode}
              selected={selectedItems.some((sel) => sel.id === c.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {selectedContent && (
        <ContentDetailsModal
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}

      <SelectionToolbar
        count={selectedItems.length}
        confirmLabel={t("contents.delete_selected.cta")}
        onConfirm={handleDeleteSelected}
        confirmColor="red"
        icon={<Trash2 className="w-4 h-4" />}
      />
    </Layout>
  );
}

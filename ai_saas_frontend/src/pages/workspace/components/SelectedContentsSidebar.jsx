import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { apiFetch } from "../../../services/apiService";
import { generatedContentRoutes } from "../../../services/apiRoutes";
import { useLanguage } from "../../../context/LanguageContext";

export default function SelectedContentsSidebar({ selectedContents, onRemove }) {
  const { t } = useLanguage();
  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    // Limpa URLs antigas para evitar vazamento de memória
    return () => {
      Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    // Para cada conteúdo de imagem, busca a URL protegida
    selectedContents.forEach((c) => {
      if (c.content_type === "image" && c.id && !imageUrls[c.id]) {
        const fetchImage = async () => {
          try {
            const res = await apiFetch(generatedContentRoutes.getImage(c.id));
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setImageUrls((prev) => ({ ...prev, [c.id]: url }));
          } catch (err) {
            console.error("Erro ao carregar imagem:", err);
          }
        };
        fetchImage();
      }
    });
  }, [selectedContents]);

  return (
    <aside className="relative w-72 p-4 bg-white rounded-lg shadow overflow-y-auto pb-20 h-[60vh]">
      <h2 className="font-semibold">{t("projects.modify_content.linked_contents")}</h2>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedContents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">
            {t("projects.modify_content.none_selected")}
          </p>
        ) : (
          selectedContents.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 relative group justify-between border-b border-gray-300"
            >
              {/* Preview */}
              {c.content_type === "image" ? (
                imageUrls[c.id] ? (
                  <img
                    src={imageUrls[c.id]}
                    alt={c.prompt || t("contents.preview.image_alt")}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                    {t("projects.modify_content.loading")}
                  </div>
                )
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                  {c.content_type.toUpperCase()}
                </div>
              )}

              {/* Infos */}
              <div className="flex-1">
                <p className="text-sm text-gray-700 line-clamp-1">
                  {c.prompt || t("projects.modify_content.no_title")}
                </p>
                <span className="text-xs text-gray-400">{c.model_used}</span>
              </div>

              {/* Remover */}
              <button
                onClick={() => onRemove(c.id)}
                className="opacity-0 group-hover:opacity-100 transition text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

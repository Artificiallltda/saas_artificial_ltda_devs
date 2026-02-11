import { FileText, Image, Video, Trash2 } from "lucide-react";
import MediaPreview from "../../../components/common/MediaPreview";
import { formatDateTime } from "../../../utils/dateUtils";
import { TEXT_MODELS } from "../../../utils/constants";
import { useLanguage } from "../../../context/LanguageContext";

function statusBadge(status, t) {
  const s = (status || "draft").toLowerCase();
  if (s === "approved") return { label: t("pro_empresa.status.approved"), cls: "bg-green-50 text-green-700 border-green-200" };
  if (s === "rejected") return { label: t("pro_empresa.status.rejected"), cls: "bg-red-50 text-red-700 border-red-200" };
  if (s === "in_review") return { label: t("pro_empresa.status.in_review"), cls: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: t("pro_empresa.status.draft"), cls: "bg-gray-50 text-gray-700 border-gray-200" };
}

export default function ContentCard({
  content,
  onSelect,
  onDelete,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  showDelete = true // nova prop
}) {
  const { t, language } = useLanguage();
  const badge = statusBadge(content?.status, t);
  return (
    <div
      className={`relative rounded-lg p-4 bg-white shadow hover:shadow-md transition ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={() => !selectionMode && onSelect(content)}
    >
      {/* Só mostra a lixeira se showDelete for true e não estiver no modo seleção */}
      {showDelete && !selectionMode && (
        <button
          className="absolute top-2 right-2 text-red-500 hover:text-red-700 z-20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(content.id);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Checkbox do modo seleção */}
      {selectionMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(content)}
          className="absolute top-2 right-2 w-4 h-4 accent-blue-600 cursor-pointer z-20"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          {content.content_type === "text" && (
            <FileText className="w-4 h-4 text-blue-500" />
          )}
          {content.content_type === "image" && (
            <Image className="w-4 h-4 text-green-500" />
          )}
          {content.content_type === "video" && (
            <Video className="w-4 h-4 text-purple-500" />
          )}
          <span className="text-xs text-gray-600">
            {formatDateTime(content.created_at, language)}
          </span>
          {content?.content_type === "text" && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}
              title={`Status: ${content.status || "draft"}`}
            >
              {badge.label}
            </span>
          )}
        </div>

        <div className="flex-grow mb-3">
          <MediaPreview 
            content={content} 
            aspectRatio={content.content_type === "video" ? "video" : "square"}
            className="w-full"
          />
        </div>

        <p className="mt-auto text-xs text-gray-700 pt-2 font-medium">
          {t("contents.card.model")}: <span>{TEXT_MODELS.find(m => m.value === content.model_used)?.label || content.model_used}</span>
        </p>
      </div>
    </div>
  );
}
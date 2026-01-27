import { X, Edit3, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../../context/LanguageContext";

export default function ProjectDetailsModal({ project, onClose, formatDateTime }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-50">
      <div className="bg-white rounded-lg p-9 w-full max-w-md shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <h2 className="text-lg font-semibold mb-4">{project.name}</h2>
        <p className="text-sm text-gray-700">
          {project.description || t("common.no_description")}
        </p>
        <div className="mt-4 text-sm text-gray-700 space-y-2">
          <p>
            <strong>{t("projects.modal.created_at")}:</strong> {formatDateTime(project.created_at)}
          </p>
          <p>
            <strong>{t("projects.modal.updated_at")}:</strong> {formatDateTime(project.updated_at)}
          </p>
        </div>
        <div className="flex justify-between items-center mt-8">
          <Link
            to={`/workspace/projects/${project.id}/edit`}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition"
          >
            <Edit3 className="w-4 h-4" /> {t("projects.modal.edit")}
          </Link>
          <Link
            to={`/workspace/projects/${project.id}/modify-content`}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-black text-white hover:opacity-90 transition"
          >
            <PlusCircle className="w-4 h-4" /> {t("projects.modal.adjust_contents")}
          </Link>
        </div>
      </div>
    </div>
  );
}

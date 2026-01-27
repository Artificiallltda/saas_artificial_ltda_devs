import { X, Edit3, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProjectDetailsModal({ project, onClose, formatDateTime }) {
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
          {project.description || "Sem descrição"}
        </p>
        <div className="mt-4 text-sm text-gray-700 space-y-2">
          <p>
            <strong>Criado em:</strong> {formatDateTime(project.created_at)}
          </p>
          <p>
            <strong>Última edição:</strong> {formatDateTime(project.updated_at)}
          </p>
        </div>
        <div className="flex justify-between items-center mt-8">
          <Link
            to={`/workspace/projects/${project.id}/edit`}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition"
          >
            <Edit3 className="w-4 h-4" /> Editar
          </Link>
          <Link
            to={`/workspace/projects/${project.id}/modify-content`}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-black text-white hover:opacity-90 transition"
          >
            <PlusCircle className="w-4 h-4" /> Ajustar Conteúdos
          </Link>
        </div>
      </div>
    </div>
  );
}

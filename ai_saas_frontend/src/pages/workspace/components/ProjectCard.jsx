import { Trash2 } from "lucide-react";

export default function ProjectCard({ project, onDelete, onSelect, formatDate }) {
  return (
    <div
      key={project.id}
      className="flex flex-col rounded-lg p-4 bg-white shadow hover:shadow-md transition cursor-pointer relative"
      onClick={() => onSelect(project)}
    >
      <button
        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(project.id);
        }}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="flex-grow">
        <h2 className="font-semibold text-black mb-1">{project.name}</h2>
        <p className="text-xs text-gray-600 line-clamp-2">
          {project.description || "Sem descrição"}
        </p>
      </div>

      <div className="mt-auto flex gap-2 text-xs text-gray-500 pt-2">
        <span>Criado: {formatDate(project.created_at)}</span>
      </div>
    </div>
  );
}
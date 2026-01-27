import { useState } from "react";
import { X, Download } from "lucide-react";
import { toast } from "react-toastify";
import ContentPreview from "./ContentPreview";
import { formatDateTime } from "../../../utils/dateUtils";
import { TEXT_MODELS } from "../../../utils/constants";

export default function ContentDetailsModal({ content, onClose, showAddButton = false }) {
  const [expanded, setExpanded] = useState(false);
  const [mediaUrl, setMediaUrl] = useState(null);

  const handleDownload = () => {
    try {
      if (!mediaUrl) {
        toast.warning("Nenhum arquivo disponível para download");
        return;
      }

      const ext = content.content_type === "video" ? "mp4" : "png";
      const filename = `Artificiall_${content.content_type}_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.${ext}`;

      const a = document.createElement("a");
      a.href = mediaUrl;
      a.download = filename;
      a.click();

      toast.success("Download iniciado!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao iniciar download");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-50">
      <div className="bg-white rounded-lg p-9 w-full max-w-5xl shadow-lg relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h2 className="text-xl font-semibold mb-6">Detalhes do Conteúdo</h2>

        {/* Preview (imagem/vídeo/texto) */}
        <div className="mb-4 flex justify-center">
          <ContentPreview content={content} isModal onMediaReady={setMediaUrl} />
        </div>

        {/* 🔽 Botão de Download */}
        {(content.content_type === "image" || content.content_type === "video") && mediaUrl && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>
                {content.content_type === "video" ? "Baixar Vídeo" : "Baixar Imagem"}
              </span>
            </button>
          </div>
        )}

        {/* Detalhes */}
        <div className="text-sm text-gray-700 space-y-2 mb-6">
          <p>
            <strong>Prompt:</strong>{" "}
            {expanded
              ? content.prompt
              : content.prompt?.slice(0, 150) +
                (content.prompt?.length > 150 ? "..." : "")}
            {content.prompt?.length > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-2 text-blue-600 hover:underline text-xs"
              >
                {expanded ? "Ver menos" : "Ver mais"}
              </button>
            )}
          </p>

          <p>
            <strong>Modelo:</strong>{" "}
            {TEXT_MODELS.find((m) => m.value === content.model_used)?.label ||
              content.model_used}
          </p>
          {content.style && <p><strong>Estilo:</strong> {content.style}</p>}
          {content.ratio && <p><strong>Proporção:</strong> {content.ratio}</p>}
          {content.content_type === "video" && (
            <p>
              <strong>Duração:</strong>{" "}
              {content.duration ? `${content.duration}s` : "—"}
            </p>
          )}
          <p><strong>Criado em:</strong> {formatDateTime(content.created_at)}</p>
        </div>

        {showAddButton && (
          <button
            onClick={() => {}}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold transition"
          >
            Adicionar ao projeto
          </button>
        )}
      </div>
    </div>
  );
}

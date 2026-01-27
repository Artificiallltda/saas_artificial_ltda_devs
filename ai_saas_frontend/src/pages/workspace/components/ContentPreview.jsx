import { useEffect, useState } from "react";
import { apiFetch } from "../../../services/apiService";
import { generatedContentRoutes } from "../../../services/apiRoutes";
import { useLanguage } from "../../../context/LanguageContext";

export default function ContentPreview({ content, isModal = false, onMediaReady }) {
  const { t } = useLanguage();
  const baseClasses = "object-contain rounded";
  const [mediaUrl, setMediaUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMedia = async () => {
      try {
        if (!content?.id) return;

        let res;
        if (content.content_type === "image") {
          res = await apiFetch(generatedContentRoutes.getImage(content.id), { method: "GET" });
        } else if (content.content_type === "video") {
          res = await apiFetch(generatedContentRoutes.getVideo(content.id), { method: "GET" });
        } else {
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setMediaUrl(url);
          onMediaReady?.(url); // notifica o pai (ex: modal) quando o arquivo estiver pronto
        }
      } catch (err) {
        console.error(`Erro ao carregar ${content.content_type}:`, err);
      }
    };

    fetchMedia();

    return () => {
      isMounted = false;
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [content]);

  // TEXTOS
  if (content.content_type === "text") {
    const text = content.content_data || content.prompt;
    const displayText = isModal
      ? text
      : text?.length > 150
      ? text.slice(0, 150) + "..."
      : text;

    return (
      <div
        className={`text-xs text-gray-700 ${
          isModal ? "whitespace-pre-wrap break-words" : "line-clamp-3"
        }`}
      >
        {displayText}
      </div>
    );
  }

  // IMAGENS
  if (content.content_type === "image") {
    return (
      <div
        className={
          isModal
            ? "flex justify-center"
            : "w-full max-h-[200px] overflow-hidden rounded"
        }
      >
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={content.prompt || t("contents.preview.image_alt")}
            className={
              isModal
                ? `${baseClasses} max-w-full max-h-[400px]`
                : `${baseClasses} w-full`
            }
          />
        ) : (
          <p className="text-gray-500 text-xs text-center py-8">
            {t("contents.preview.loading_image")}
          </p>
        )}
      </div>
    );
  }

  // VÍDEOS
  if (content.content_type === "video") {
    return (
      <div
        className={
          isModal
            ? "flex items-center justify-center mx-auto w-[800px] h-[500px] bg-gray-50 rounded"
            : "relative w-full max-h-[200px] overflow-hidden rounded"
        }
      >
        {mediaUrl ? (
          isModal ? (
            <video
              src={mediaUrl}
              controls
              className={`${baseClasses} max-w-full max-h-full`}
              preload="metadata"
            />
          ) : (
            <video
              src={mediaUrl}
              className={`${baseClasses} w-full opacity-90`}
              preload="metadata"
              muted
              playsInline
              onMouseOver={(e) => e.target.pause()}
              onClick={(e) => e.preventDefault()}
            />
          )
        ) : (
          <p className="text-gray-500 text-xs text-center py-8">
            {t("contents.preview.loading_video")}
          </p>
        )}
      </div>
    );
  }

  return null;
}
import { useEffect, useState } from "react";
import { apiFetch } from "../../services/apiService";
import { generatedContentRoutes } from "../../services/apiRoutes";
import { useLanguage } from "../../context/LanguageContext";

const ASPECT_RATIOS = {
  square: "aspect-square",
  video: "aspect-video", 
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  wide: "aspect-[16/9]"
};

export default function MediaPreview({ 
  content, 
  aspectRatio = "square",
  className = "",
  onMediaReady,
  showControls = false,
  autoPlay = false,
  muted = true
}) {
  const { t } = useLanguage();
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const aspectClass = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS.square;
  const baseClasses = `w-full ${aspectClass} overflow-hidden rounded-lg bg-gray-100`;

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
          setIsLoading(false);
          onMediaReady?.(url);
        }
      } catch (err) {
        console.error(`Erro ao carregar ${content.content_type}:`, err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMedia();

    return () => {
      isMounted = false;
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [content, onMediaReady]);

  // TEXTOS
  if (content.content_type === "text") {
    const text = content.content_data || content.prompt;
    const displayText = text?.length > 150 ? text.slice(0, 150) + "..." : text;

    return (
      <div className={`${baseClasses} ${className} p-4 flex items-center justify-center`}>
        <div className="text-xs text-gray-700 text-center line-clamp-4">
          {displayText}
        </div>
      </div>
    );
  }

  // IMAGENS
  if (content.content_type === "image") {
    return (
      <div className={`${baseClasses} ${className} relative group`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-gray-500 text-xs text-center">
              <div className="animate-pulse">{t("contents.preview.loading_image")}</div>
            </div>
          </div>
        )}
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={content.prompt || t("contents.preview.image_alt")}
            className={`w-full h-full object-cover transition-transform duration-200 group-hover:scale-105`}
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-xs text-center">
              {t("contents.preview.error_image")}
            </p>
          </div>
        )}
      </div>
    );
  }

  // VÍDEOS
  if (content.content_type === "video") {
    return (
      <div className={`${baseClasses} ${className} relative group`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-gray-500 text-xs text-center">
              <div className="animate-pulse">{t("contents.preview.loading_video")}</div>
            </div>
          </div>
        )}
        {mediaUrl ? (
          <video
            src={mediaUrl}
            className={`w-full h-full object-cover ${showControls ? '' : 'group-hover:opacity-90'} transition-opacity duration-200`}
            preload="metadata"
            controls={showControls}
            autoPlay={autoPlay}
            muted={muted}
            playsInline
            onMouseEnter={(e) => !showControls && e.target.play()}
            onMouseLeave={(e) => !showControls && e.target.pause()}
            onError={() => setIsLoading(false)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-xs text-center">
              {t("contents.preview.error_video")}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${className} flex items-center justify-center`}>
      <p className="text-gray-500 text-xs text-center">
        {t("contents.preview.unsupported")}
      </p>
    </div>
  );
}

export { ASPECT_RATIOS };

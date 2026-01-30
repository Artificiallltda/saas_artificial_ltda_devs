import MediaPreview from "../../../components/common/MediaPreview";
import { useLanguage } from "../../../context/LanguageContext";

export default function ContentPreview({ content, isModal = false, onMediaReady }) {
  const { t } = useLanguage();

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

  return (
    <MediaPreview
      content={content}
      aspectRatio={content.content_type === "video" ? "video" : "square"}
      className={isModal ? "max-w-[800px] max-h-[500px]" : "w-full"}
      onMediaReady={onMediaReady}
      showControls={isModal}
      autoPlay={false}
      muted={true}
    />
  );
}
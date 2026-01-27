import React from "react";
import TypingIndicator from "./TypingIndicator";
import MessageContent from "./MessageContent";
import { chatRoutes } from "../../../../services/apiRoutes";
import { Download } from "lucide-react";
import { useLanguage } from "../../../../context/LanguageContext";

function MessageBubble({ msg }) {
  const { t } = useLanguage();
  const isUser = msg.role === "user";
  const { content, attachments } = msg;

  const truncateText = (text, max = 30) => {
    if (!text) return "";
    return text.length > max ? text.substring(0, max) + "..." : text;
  };

  // Função para baixar imagem com nome personalizado
  const handleDownload = (url) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        const filename = `Artificiall Image - ${new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", "_")
          .replace(/:/g, "-")}.png`;
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert(t("generation.text.message.download_image_error")));
  };

  return (
    <div
      className={`max-w-[75%] p-4 rounded-2xl shadow-md break-words my-6 leading-relaxed ${
        isUser
          ? "ml-auto bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-theme-dark)] text-white"
          : "mr-auto bg-white text-gray-800"
      }`}
    >
      {content === "typing" ? (
        <TypingIndicator />
      ) : (
        <>
          {content && (
            <div className="markdown">
              <MessageContent content={content} isUserMessage={isUser} />
            </div>
          )}
          {attachments && attachments.length > 0 && (
            <div
              className={`mt-5 flex flex-wrap gap-4 ${
                attachments.length === 1 ? "justify-center" : "justify-start"
              }`}
            >
              {attachments.map((att, i) => {
                const isImage = att.mimetype?.startsWith("image/");
                const isPDF = att.mimetype === "application/pdf";
                const attUrl = att.isPreview ? att.url : chatRoutes.attachments(att.id);

                if (isPDF) {
                  return (
                    <a
                      key={i}
                      href={attUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center w-28 h-28 rounded-lg bg-red-500 p-2 text-center hover:bg-red-700 transition"
                    >
                      <div className="flex flex-col items-center justify-center w-full h-full rounded-md bg-white p-3">
                        <span className="font-bold text-lg text-red-500">.PDF</span>
                        <span className="text-xs mt-1 text-gray-800 break-all">{att.name}</span>
                      </div>
                    </a>
                  );
                }

                if (!isImage) {
                  return (
                    <a
                      key={i}
                      href={attUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white underline break-all px-2 py-1"
                    >
                      {att.name || t("generation.text.message.file")}
                    </a>
                  );
                }

                return (
                  <div className="relative" key={i}>
                    <img
                      src={attUrl}
                      alt={att.name || t("generation.text.message.image")}
                      className={
                        attachments.length === 1
                          ? "rounded-md object-contain max-w-[400px] max-h-[250px]"
                          : "rounded-md object-cover w-28 h-28"
                      }
                    />
                    {!isUser && (
                      <button
                        onClick={() => handleDownload(attUrl)}
                        className="absolute top-2 right-2 bg-gray-800 text-white p-1 rounded-lg hover:bg-gray-700 transition cursor-pointer"
                        title={t("generation.text.message.download_image")}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default React.memo(MessageBubble);

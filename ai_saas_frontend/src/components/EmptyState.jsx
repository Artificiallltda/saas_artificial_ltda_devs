import { PlusCircle, MessageSquare, FileText, Search } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function EmptyState({
  title,
  description,
  ctaLabel,
  onCtaClick,
  icon: Icon = PlusCircle,
}) {
  const { t } = useLanguage();
  const displayCtaLabel = ctaLabel || t("skeletons.chat.empty.cta", "New conversation");
  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 text-blue-600 mb-4">
        <Icon size={28} />
      </div>

      <h2 className="text-lg font-semibold text-gray-900">
        {title}
      </h2>

      <p className="mt-2 text-sm text-gray-600 max-w-md">
        {description}
      </p>

      {onCtaClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCtaClick?.();
          }}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl shadow hover:bg-blue-700 transition-colors cursor-pointer pointer-events-auto"
        >
          <PlusCircle size={16} />
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export function ChatEmptyState({ onCreateChat }) {
  const { t } = useLanguage();
  
  return (
    <EmptyState
      title={t("skeletons.chat.empty.title", "No conversations yet")}
      description={t("skeletons.chat.empty.description", "Start a new conversation to interact with AI. Create your first chat!")}
      ctaLabel={t("skeletons.chat.empty.cta", "New conversation")}
      icon={MessageSquare}
      onCtaClick={onCreateChat}
    />
  );
}

export function MessageEmptyState() {
  const { t } = useLanguage();
  
  return (
    <EmptyState
      title={t("skeletons.message.empty.title", "No messages in this conversation")}
      description={t("skeletons.message.empty.description", "Start by typing a message to begin the chat. The AI will answer your question!")}
      icon={MessageSquare}
    />
  );
}

export function SearchEmptyState() {
  const { t } = useLanguage();
  
  return (
    <EmptyState
      title={t("skeletons.search.empty.title", "No conversations found")}
      description={t("skeletons.search.empty.description", "Try using other terms to search your previous conversations.")}
      icon={Search}
    />
  );
}

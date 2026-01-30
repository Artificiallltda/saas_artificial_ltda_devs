import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function ErrorState({ 
  title, 
  description, 
  onRetry,
  isLoading = false 
}) {
  const { t } = useLanguage();
  
  const displayTitle = title || t("skeletons.error.title", "Something went wrong");
  const displayDescription = description || t("skeletons.error.description", "Could not load the data. Try again.");
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mb-4">
        <AlertCircle size={24} />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {displayTitle}
      </h3>

      <p className="text-sm text-gray-600 max-w-md mb-6">
        {displayDescription}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading 
            ? t("skeletons.error.retry_loading", "Trying...") 
            : t("skeletons.error.retry", "Try again")}
        </button>
      )}
    </div>
  );
}

export function ChatErrorState({ onRetry, isLoading }) {
  const { t } = useLanguage();
  
  return (
    <ErrorState
      title={t("skeletons.error.chat.title", "Error loading chats")}
      description={t("skeletons.error.chat.description", "Could not load your conversation list. Check your connection and try again.")}
      onRetry={onRetry}
      isLoading={isLoading}
    />
  );
}

export function MessageErrorState({ onRetry, isLoading }) {
  const { t } = useLanguage();
  
  return (
    <ErrorState
      title={t("skeletons.error.message.title", "Error loading messages")}
      description={t("skeletons.error.message.description", "Could not load messages from this chat. Try again later.")}
      onRetry={onRetry}
      isLoading={isLoading}
    />
  );
}

export function SearchErrorState({ onRetry, isLoading }) {
  const { t } = useLanguage();
  
  return (
    <ErrorState
      title={t("skeletons.error.search.title", "Search error")}
      description={t("skeletons.error.search.description", "Could not perform the search. Try again.")}
      onRetry={onRetry}
      isLoading={isLoading}
    />
  );
}

export default { ErrorState, ChatErrorState, MessageErrorState, SearchErrorState };

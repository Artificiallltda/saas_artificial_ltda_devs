import React from "react";
import { MessageCirclePlus, FileText, RefreshCw } from "lucide-react";

export default function EmptyState({ 
  type = "chat", 
  onRetry,
  className = "",
  translations = {}
}) {

  const getEmptyStateConfig = () => {
    switch (type) {
      case "no-chats":
        return {
          icon: MessageCirclePlus,
          title: translations.no_chats_title || "Nenhum chat encontrado",
          description: translations.no_chats_description || "Você ainda não criou nenhuma conversa. Comece uma nova interação com a IA!",
          action: translations.no_chats_action || "Criar novo chat",
        };
      case "empty-chat":
        return {
          icon: MessageCirclePlus,
          title: translations.empty_chat_title || "Conversa vazia",
          description: translations.empty_chat_description || "Comece digitando uma mensagem para iniciar o chat com a IA.",
          action: translations.empty_chat_action || "Enviar primeira mensagem",
        };
      case "error-chats":
        return {
          icon: RefreshCw,
          title: translations.error_chats_title || "Erro ao carregar chats",
          description: translations.error_chats_description || "Não foi possível carregar sua lista de conversas. Verifique sua conexão e tente novamente.",
          action: translations.error_chats_action || "Tentar novamente",
        };
      case "error-messages":
        return {
          icon: RefreshCw,
          title: translations.error_messages_title || "Erro ao carregar mensagens",
          description: translations.error_messages_description || "Não foi possível carregar as mensagens deste chat. Verifique sua conexão e tente novamente.",
          action: translations.error_messages_action || "Tentar novamente",
        };
      default:
        return {
          icon: FileText,
          title: translations.default_title || "Nenhum conteúdo disponível",
          description: translations.default_description || "Não há conteúdo para exibir no momento.",
          action: null,
        };
    }
  };

  const config = getEmptyStateConfig();
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {config.title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-sm">
        {config.description}
      </p>
      
      {config.action && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          {type.startsWith("error") && <RefreshCw className="w-4 h-4" />}
          {config.action}
        </button>
      )}
    </div>
  );
}

import React from "react";
import { Loader2, Globe, Search } from "lucide-react";
import { useLanguage } from "../../../../context/LanguageContext";

export default function DeepResearchWarning() {
  const { t } = useLanguage();

  return (
    <div className="max-w-[75%] p-4 rounded-2xl shadow-md my-6 leading-relaxed mr-auto bg-blue-50 border border-blue-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <Search className="w-4 h-4 text-blue-500" />
        </div>
        <span className="text-sm font-semibold text-blue-800">
          Deep Research
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-blue-700">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">
          Este Modelo de IA faz pesquisas online, aguarde enquanto realizamos todas as buscas necessárias para fornecer sua resposta.
        </span>
      </div>
      
      <div className="mt-3 flex items-center gap-1">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
        <span className="text-xs text-blue-600 ml-2">
          Buscando informações...
        </span>
      </div>
    </div>
  );
}
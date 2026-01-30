import { useState } from "react";
import Layout from "../../../components/layout/Layout";
import { useLanguage } from "../../../context/LanguageContext";
import useContentsFetch from "../hooks/useContentsFetch";

export default function GeneratedContentsList() {
  const { t } = useLanguage();
  const { loading, allContents, setAllContents, handleDeleteContent } = useContentsFetch();
  
  // Estados para abas e busca
  const [activeTab, setActiveTab] = useState("text");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar conteúdos por tipo e busca
  const filteredContents = allContents.filter((content) => {
    const matchesTab = content.type === activeTab;
    const matchesSearch = searchTerm === "" || 
      content.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">
          {t("contents.title", "My Generated Contents")}
        </h1>
        <p className="text-gray-600 mb-6">
          {t("contents.subtitle", "Here are all the contents you generated with AI")}
        </p>

        {/* Abas */}
        <div className="flex space-x-6 border-b border-gray-300 mb-4 text-sm font-semibold">
          {["text", "image", "video"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 text-sm font-semibold transition ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-blue-500"
              }`}
            >
              {t(`contents.tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1) + 's')}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="flex items-center justify-between mb-4">
          <input
            type="search"
            placeholder={t("contents.search.placeholder", "Search contents...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md pl-3 py-2 bg-white rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
          />
        </div>

        {/* Conteúdo principal */}
        <div className="mt-6">
          {loading ? (
            // Skeleton durante o carregamento
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContents.length === 0 ? (
            // Estado vazio
            <div className="flex flex-col items-center justify-center text-center py-20 px-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 text-blue-600 mb-4">
                {activeTab === "text" && (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {activeTab === "image" && (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {activeTab === "video" && (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {t("contents.empty.title", "No contents found")}
              </h2>
              <p className="text-sm text-gray-600 max-w-md">
                {t("contents.empty.description", "Your generated contents will appear here.")}
              </p>
            </div>
          ) : (
            // Lista de conteúdos
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContents.map((content) => (
                <div key={content.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {content.type === "text" && (
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {content.type === "image" && (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      {content.type === "video" && (
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {content.title || content.prompt?.slice(0, 30) + "..." || "Untitled"}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(content.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {content.prompt || content.description || "No description available"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
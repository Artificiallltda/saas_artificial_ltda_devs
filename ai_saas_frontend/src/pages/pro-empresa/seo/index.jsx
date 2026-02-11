import { useEffect } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";

export default function ProEmpresaSEO() {
  const { checkFeatureAccess } = useFeatureRestriction();

  useEffect(() => {
    // qualquer uma dessas flags habilita parte do módulo SEO
    checkFeatureAccess("seo_keyword_research");
  }, [checkFeatureAccess]);

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">SEO</h1>
          <p className="mt-1 text-sm text-gray-600">
            Placeholder de UI para: keyword research, briefing e score em tempo
            real.
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Pesquisa de keywords">
              <div className="text-sm text-gray-700">
                Campo de keyword + locale/country + botão “Pesquisar”.
              </div>
            </Panel>
            <Panel title="Score on-page">
              <div className="text-sm text-gray-700">
                Score 0–100 + checklist (título, headings, densidade, tamanho,
                FAQ, meta description).
              </div>
            </Panel>
            <Panel title="Briefing SEO (LLM)">
              <div className="text-sm text-gray-700">
                Modal com: keyword, persona, tipo de conteúdo → retorna título,
                headings, tópicos e FAQs.
              </div>
            </Panel>
            <Panel title="Logs e limites">
              <div className="text-sm text-gray-700">
                Indicadores de consumo (seo_requests) e mensagens de limite.
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}


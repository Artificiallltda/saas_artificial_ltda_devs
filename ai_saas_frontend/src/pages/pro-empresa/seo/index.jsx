import { useEffect } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { useLanguage } from "../../../context/LanguageContext";

export default function ProEmpresaSEO() {
  const { checkFeatureAccess } = useFeatureRestriction();
  const { t } = useLanguage();

  useEffect(() => {
    // qualquer uma dessas flags habilita parte do módulo SEO
    checkFeatureAccess("seo_keyword_research");
  }, [checkFeatureAccess]);

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t("pro_empresa.seo.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("pro_empresa.seo.subtitle")}
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title={t("pro_empresa.seo.panels.keyword_research")}>
              <div className="text-sm text-gray-700">
                {t("pro_empresa.seo.panels.keyword_research.desc")}
              </div>
            </Panel>
            <Panel title={t("pro_empresa.seo.panels.on_page_score")}>
              <div className="text-sm text-gray-700">
                {t("pro_empresa.seo.panels.on_page_score.desc")}
              </div>
            </Panel>
            <Panel title={t("pro_empresa.seo.panels.briefing")}>
              <div className="text-sm text-gray-700">
                {t("pro_empresa.seo.panels.briefing.desc")}
              </div>
            </Panel>
            <Panel title={t("pro_empresa.seo.panels.logs_limits")}>
              <div className="text-sm text-gray-700">
                {t("pro_empresa.seo.panels.logs_limits.desc")}
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


import { useEffect } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { useLanguage } from "../../../context/LanguageContext";

export default function ProEmpresaIntegrations() {
  const { checkFeatureAccess } = useFeatureRestriction();
  const { t } = useLanguage();

  useEffect(() => {
    checkFeatureAccess("cms_integration_wordpress");
  }, [checkFeatureAccess]);

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t("pro_empresa.integrations.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("pro_empresa.integrations.subtitle")}
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">
                {t("pro_empresa.integrations.wordpress.title")}
              </div>
              <div className="mt-2 text-sm text-gray-700">
                {t("pro_empresa.integrations.wordpress.desc")}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">
                {t("pro_empresa.integrations.webhook.title")}
              </div>
              <div className="mt-2 text-sm text-gray-700">
                {t("pro_empresa.integrations.webhook.desc")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


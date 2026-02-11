import { useEffect } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";

export default function ProEmpresaIntegrations() {
  const { checkFeatureAccess } = useFeatureRestriction();

  useEffect(() => {
    checkFeatureAccess("cms_integration_wordpress");
  }, [checkFeatureAccess]);

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Integrações</h1>
          <p className="mt-1 text-sm text-gray-600">
            Placeholder de UI para configurar WordPress e Webhooks/CRM por
            empresa (tenant).
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">
                WordPress
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Campos: site_url, username, application_password + botão “Testar”
                + ação “Publicar”.
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">
                Webhook/CRM
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Endpoint + secret + botão “Enviar teste”.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


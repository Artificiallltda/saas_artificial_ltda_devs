import { useEffect } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";

export default function ProEmpresaApprovals() {
  const { checkFeatureAccess } = useFeatureRestriction();

  useEffect(() => {
    checkFeatureAccess("collab_approval_flow");
  }, [checkFeatureAccess]);

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Aprovações</h1>
          <p className="mt-1 text-sm text-gray-600">
            Placeholder de UI para fluxo simples de aprovação + timeline.
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">
                Para revisar
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Lista de documentos “in_review” (visível para owner/admin).
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">
                Timeline do documento
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Registro: draft → submit-review → approve/reject.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


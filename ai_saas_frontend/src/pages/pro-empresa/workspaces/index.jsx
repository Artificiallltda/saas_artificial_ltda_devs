import { useEffect } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";

export default function ProEmpresaWorkspaces() {
  const { checkFeatureAccess } = useFeatureRestriction();

  useEffect(() => {
    checkFeatureAccess("collab_workspaces");
  }, [checkFeatureAccess]);

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
          <p className="mt-1 text-sm text-gray-600">
            Placeholder de UI para organizar conteúdos por time/campanha e
            compartilhar entre usuários do mesmo tenant.
          </p>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-700">
              Aqui vai entrar:
              <ul className="list-disc ml-6 mt-2 text-sm text-gray-700">
                <li>Lista de workspaces</li>
                <li>Criar workspace (nome + tipo: team/campaign)</li>
                <li>Mover projetos/conteúdos para um workspace</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


import { Link } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useFeatureRestriction } from "../../hooks/useFeatureRestriction";

export default function ProEmpresaHome() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasFeatureAccess } = useFeatureRestriction();

  const canSEO =
    hasFeatureAccess("seo_keyword_research") ||
    hasFeatureAccess("seo_briefing") ||
    hasFeatureAccess("seo_realtime_score");
  const canWorkspaces = hasFeatureAccess("collab_workspaces");
  const canApprovals = hasFeatureAccess("collab_approval_flow");
  const canIntegrations =
    hasFeatureAccess("cms_integration_wordpress") ||
    hasFeatureAccess("crm_integration_basic");
  const canCompany = hasFeatureAccess("pro_empresa");

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t("pro_empresa.home.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("pro_empresa.home.subtitle")}
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              title={t("pro_empresa.home.cards.company.title")}
              description={t("pro_empresa.home.cards.company.description")}
              to="/pro-empresa/company"
              enabled={canCompany}
            />
            <Card
              title={t("pro_empresa.home.cards.seo.title")}
              description={t("pro_empresa.home.cards.seo.description")}
              to="/pro-empresa/seo"
              enabled={canSEO}
            />
            <Card
              title={t("pro_empresa.home.cards.workspaces.title")}
              description={t("pro_empresa.home.cards.workspaces.description")}
              to="/pro-empresa/workspaces"
              enabled={canWorkspaces}
            />
            <Card
              title={t("pro_empresa.home.cards.approvals.title")}
              description={t("pro_empresa.home.cards.approvals.description")}
              to="/pro-empresa/approvals"
              enabled={canApprovals}
            />
            <Card
              title={t("pro_empresa.home.cards.integrations.title")}
              description={t("pro_empresa.home.cards.integrations.description")}
              to="/pro-empresa/integrations"
              enabled={canIntegrations}
            />
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{t("pro_empresa.home.current_plan")}</span>{" "}
              {user?.plan?.name || "—"}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {t("pro_empresa.home.tip")}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Card({ title, description, to, enabled }) {
  const { t } = useLanguage();
  return (
    <Link
      to={to}
      className={`rounded-xl border p-4 transition ${
        enabled
          ? "border-gray-200 bg-white hover:shadow-sm"
          : "border-gray-200 bg-gray-50 opacity-80"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            enabled
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-gray-100 border-gray-200 text-gray-600"
          }`}
        >
          {enabled ? t("pro_empresa.home.card.enabled") : t("pro_empresa.home.card.disabled")}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </Link>
  );
}


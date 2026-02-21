import { useEffect, useState } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { useLanguage } from "../../../context/LanguageContext";
import { apiFetch } from "../../../services/apiService";
import { integrationRoutes } from "../../../services/apiRoutes";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";

export default function ProEmpresaIntegrations() {
  const { checkFeatureAccess } = useFeatureRestriction();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [integration, setIntegration] = useState(null);
  const [formData, setFormData] = useState({
    site_url: "",
    username: "",
    password: "",
  });
  const [testResult, setTestResult] = useState(null);

  const isOwner = (user?.company_role || "").toLowerCase() === "owner";
  const isAdmin = (user?.company_role || "").toLowerCase() === "admin";
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    checkFeatureAccess("pro_empresa");
  }, [checkFeatureAccess]);

  useEffect(() => {
    loadIntegration();
  }, []);

  async function loadIntegration() {
    setLoading(true);
    try {
      const data = await apiFetch(integrationRoutes.wordpress.get);
      const integ = data?.integration;
      if (integ) {
        setIntegration(integ);
        if (integ.config) {
          setFormData({
            site_url: integ.config.site_url || "",
            username: integ.config.username || "",
            password: "", // Não preencher senha por segurança
          });
        }
      }
    } catch (e) {
      // Se não existe, tudo bem, apenas não mostra nada
      console.log("Nenhuma integração WordPress encontrada");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!canManage) {
      toast.error(t("pro_empresa.integrations.toast.unauthorized"));
      return;
    }

    if (!formData.site_url || !formData.username || !formData.password) {
      toast.error(t("pro_empresa.integrations.toast.fields_required"));
      return;
    }

    setSaving(true);
    try {
      await apiFetch(integrationRoutes.wordpress.save, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      toast.success(t("pro_empresa.integrations.toast.saved"));
      setTestResult(null);
      await loadIntegration();
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.integrations.toast.save_error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!canManage) {
      toast.error(t("pro_empresa.integrations.toast.unauthorized"));
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const data = await apiFetch(integrationRoutes.wordpress.test, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setTestResult({
        success: data.success,
        message: data.message || data.user || "",
      });
      if (data.success) {
        toast.success(t("pro_empresa.integrations.toast.test_success"));
      } else {
        toast.error(t("pro_empresa.integrations.toast.test_failed"));
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: e?.message || t("pro_empresa.integrations.toast.test_error"),
      });
      toast.error(e?.message || t("pro_empresa.integrations.toast.test_error"));
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-sm text-gray-500">{t("common.loading")}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            {t("pro_empresa.integrations.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("pro_empresa.integrations.subtitle")}
          </p>

          {!canManage && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                {t("pro_empresa.integrations.unauthorized_message")}
              </p>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("pro_empresa.integrations.wordpress.title")}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {t("pro_empresa.integrations.wordpress.description")}
            </p>

            {integration && integration.last_tested_at && (
              <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600">
                  <span className="font-medium">
                    {t("pro_empresa.integrations.last_tested")}:
                  </span>{" "}
                  {new Date(integration.last_tested_at).toLocaleString()}
                  {integration.last_tested_status && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs ${
                        integration.last_tested_status === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {integration.last_tested_status === "success"
                        ? t("pro_empresa.integrations.status.success")
                        : t("pro_empresa.integrations.status.failed")}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="site_url"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("pro_empresa.integrations.wordpress.site_url")}
                </label>
                <input
                  type="url"
                  id="site_url"
                  value={formData.site_url}
                  onChange={(e) =>
                    setFormData({ ...formData, site_url: e.target.value })
                  }
                  placeholder="https://meusite.com"
                  disabled={!canManage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t("pro_empresa.integrations.wordpress.site_url_hint")}
                </p>
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("pro_empresa.integrations.wordpress.username")}
                </label>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="admin"
                  disabled={!canManage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("pro_empresa.integrations.wordpress.password")}
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={integration ? "••••••••" : "Application Password"}
                  disabled={!canManage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t("pro_empresa.integrations.wordpress.password_hint")}
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border ${
                    testResult.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      testResult.success ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {testResult.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleTest}
                  disabled={!canManage || testing || !formData.site_url || !formData.username || !formData.password}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing
                    ? t("pro_empresa.integrations.testing")
                    : t("pro_empresa.integrations.test_connection")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canManage || saving || !formData.site_url || !formData.username || !formData.password}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? t("common.saving")
                    : integration
                    ? t("pro_empresa.integrations.update")
                    : t("pro_empresa.integrations.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { apiFetch } from "../../../services/apiService";
import { workspaceRoutes } from "../../../services/apiRoutes";
import { toast } from "react-toastify";
import { useLanguage } from "../../../context/LanguageContext";

export default function ProEmpresaWorkspaces() {
  const { checkFeatureAccess } = useFeatureRestriction();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("team");

  useEffect(() => {
    checkFeatureAccess("collab_workspaces");
  }, [checkFeatureAccess]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch(workspaceRoutes.list);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.workspaces.toast.load_error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => name.trim().length >= 2, [name]);

  async function handleCreate() {
    if (!canCreate) return;
    try {
      await apiFetch(workspaceRoutes.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      setName("");
      setType("team");
      await load();
      toast.success(t("pro_empresa.workspaces.toast.created"));
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.workspaces.toast.create_error"));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t("pro_empresa.workspaces.confirm_remove"))) return;
    try {
      await apiFetch(workspaceRoutes.delete(id), { method: "DELETE" });
      await load();
      toast.success(t("pro_empresa.workspaces.toast.removed"));
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.workspaces.toast.remove_error"));
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t("pro_empresa.workspaces.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("pro_empresa.workspaces.subtitle")}
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">{t("pro_empresa.workspaces.create.title")}</div>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t("pro_empresa.workspaces.fields.name")}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white"
                    placeholder={t("pro_empresa.workspaces.fields.name_placeholder")}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t("pro_empresa.workspaces.fields.type")}</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white"
                  >
                    <option value="team">{t("pro_empresa.workspaces.type.team")}</option>
                    <option value="campaign">{t("pro_empresa.workspaces.type.campaign")}</option>
                  </select>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!canCreate}
                  className="w-full h-10 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {t("pro_empresa.workspaces.create.cta")}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">{t("pro_empresa.workspaces.list.title")}</div>
                <button
                  onClick={load}
                  className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                >
                  {t("pro_empresa.approvals.refresh")}
                </button>
              </div>

              <div className="mt-3">
                {loading ? (
                  <div className="text-sm text-gray-500">{t("common.loading")}</div>
                ) : items.length === 0 ? (
                  <div className="text-sm text-gray-500">{t("pro_empresa.workspaces.list.empty")}</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {w.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t("pro_empresa.workspaces.fields.type")}:{" "}
                            {w.type === "campaign"
                              ? t("pro_empresa.workspaces.type.campaign")
                              : t("pro_empresa.workspaces.type.team")}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(w.id)}
                          className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          {t("pro_empresa.workspaces.remove")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


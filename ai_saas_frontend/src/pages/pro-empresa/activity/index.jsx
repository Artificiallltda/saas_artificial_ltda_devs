import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { useLanguage } from "../../../context/LanguageContext";
import { apiFetch } from "../../../services/apiService";
import { companyRoutes } from "../../../services/apiRoutes";
import { toast } from "react-toastify";

function buildQuery(filters, page = 1) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", "30");
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.actor_id) params.set("actor_id", filters.actor_id);
  if (filters.event_type) params.set("event_type", filters.event_type);
  if (filters.workspace_id) params.set("workspace_id", filters.workspace_id);
  return params.toString();
}

export default function ProEmpresaActivity() {
  const { checkFeatureAccess } = useFeatureRestriction();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [filterOptions, setFilterOptions] = useState({ actions: [], actors: [], workspaces: [] });
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    actor_id: "",
    event_type: "",
    workspace_id: "",
  });

  useEffect(() => {
    checkFeatureAccess("pro_empresa");
  }, [checkFeatureAccess]);

  async function loadFilterOptions() {
    try {
      const data = await apiFetch(companyRoutes.activityFilters);
      setFilterOptions({
        actions: Array.isArray(data?.actions) ? data.actions : [],
        actors: Array.isArray(data?.actors) ? data.actors : [],
        workspaces: Array.isArray(data?.workspaces) ? data.workspaces : [],
      });
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.activity.toast.load_filters_error"));
    }
  }

  async function loadActivity(page = 1, currentFilters = filters) {
    setLoading(true);
    try {
      const qs = buildQuery(currentFilters, page);
      const data = await apiFetch(companyRoutes.activity(qs));
      setRows(Array.isArray(data?.items) ? data.items : []);
      setPagination(data?.pagination || { page: 1, total_pages: 1, total: 0 });
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.activity.toast.load_error"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFilterOptions();
    loadActivity(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getEventLabel(eventType) {
    if (!eventType) return "—";
    const key = `pro_empresa.activity.actions.${eventType}`;
    const translated = t(key);
    // Fallback: se não houver tradução cadastrada, mostra o valor bruto.
    return translated === key ? eventType : translated;
  }

  const canPrev = (pagination?.page || 1) > 1;
  const canNext = (pagination?.page || 1) < (pagination?.total_pages || 1);

  const mappedRows = useMemo(() => {
    return rows.map((r) => {
      const actor = r?.actor_user?.full_name || r?.actor_user?.email || t("common.not_informed");
      const workspace = r?.workspace?.name || "—";
      const createdAt = r?.created_at ? new Date(r.created_at).toLocaleString() : "—";
      return {
        ...r,
        actor,
        workspace,
        createdAt,
      };
    });
  }, [rows, t]);

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t("pro_empresa.activity.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">{t("pro_empresa.activity.subtitle")}</p>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <select
                value={filters.actor_id}
                onChange={(e) => setFilters((p) => ({ ...p, actor_id: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="">{t("pro_empresa.activity.filters.actor_all")}</option>
                {filterOptions.actors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.email}
                  </option>
                ))}
              </select>
              <select
                value={filters.event_type}
                onChange={(e) => setFilters((p) => ({ ...p, event_type: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="">{t("pro_empresa.activity.filters.action_all")}</option>
                {filterOptions.actions.map((a) => (
                  <option key={a} value={a}>
                    {getEventLabel(a)}
                  </option>
                ))}
              </select>
              <select
                value={filters.workspace_id}
                onChange={(e) => setFilters((p) => ({ ...p, workspace_id: e.target.value }))}
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="">{t("pro_empresa.activity.filters.workspace_all")}</option>
                {filterOptions.workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => loadActivity(1, filters)}
                className="h-9 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                {t("pro_empresa.activity.filters.apply")}
              </button>
              <button
                onClick={() => {
                  const clear = {
                    start_date: "",
                    end_date: "",
                    actor_id: "",
                    event_type: "",
                    workspace_id: "",
                  };
                  setFilters(clear);
                  loadActivity(1, clear);
                }}
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50"
              >
                {t("pro_empresa.activity.filters.clear")}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            {loading ? (
              <div className="text-sm text-gray-500">{t("common.loading")}</div>
            ) : mappedRows.length === 0 ? (
              <div className="text-sm text-gray-500">{t("pro_empresa.activity.empty")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-2 pr-4">{t("pro_empresa.activity.table.when")}</th>
                      <th className="py-2 pr-4">{t("pro_empresa.activity.table.actor")}</th>
                      <th className="py-2 pr-4">{t("pro_empresa.activity.table.action")}</th>
                      <th className="py-2 pr-4">{t("pro_empresa.activity.table.workspace")}</th>
                      <th className="py-2 pr-0">{t("pro_empresa.activity.table.message")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4 text-gray-700">{r.createdAt}</td>
                        <td className="py-2 pr-4 text-gray-700">{r.actor}</td>
                        <td className="py-2 pr-4">
                          <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                            {getEventLabel(r.event_type)}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{r.workspace}</td>
                        <td className="py-2 pr-0 text-gray-700">{r.message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {t("pro_empresa.activity.pagination.total")} {pagination?.total || 0}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={!canPrev}
                  onClick={() => loadActivity((pagination?.page || 1) - 1)}
                  className="h-8 px-3 rounded-md border border-gray-200 bg-white text-xs disabled:opacity-50"
                >
                  {t("pro_empresa.activity.pagination.prev")}
                </button>
                <span className="text-xs text-gray-600">
                  {pagination?.page || 1} / {pagination?.total_pages || 1}
                </span>
                <button
                  disabled={!canNext}
                  onClick={() => loadActivity((pagination?.page || 1) + 1)}
                  className="h-8 px-3 rounded-md border border-gray-200 bg-white text-xs disabled:opacity-50"
                >
                  {t("pro_empresa.activity.pagination.next")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


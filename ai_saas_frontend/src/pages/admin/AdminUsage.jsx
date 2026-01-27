import { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import { useLanguage } from "../../context/LanguageContext";
import { backendMessageKeyMap } from "../../i18n";

export default function AdminUsage() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState([]);
  const [model, setModel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fmt = (n) => (n ?? 0).toLocaleString(language);
  const pct = (used, quota) =>
    quota ? Math.min(100, Math.round(((used ?? 0) / quota) * 100)) : null;

  const placeholder = t("common.placeholder");

  const errorText = (() => {
    if (!error) return "";
    const key = backendMessageKeyMap[error];
    if (key) return t(key);
    return t(error);
  })();

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (model) params.set("model", model);
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const res = await fetch(`/api/admin/usage?${params.toString()}`, { credentials: "include" });
      const j = await res.json();
      if (!res.ok) {
        const backendMsg = j?.error || "admin.usage.load_error";
        setError(backendMsg);
        setRows([]);
        return;
      }
      setRows(j.results || []);
    } catch (e) {
      setError(e?.message || "admin.usage.load_data_error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("admin.usage.title")}</h1>
          {/* extra: botão de exportação (opcional) */}
          {/* <button className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
            Exportar CSV
          </button> */}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500">{t("admin.usage.filters.model")}</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">{t("admin.usage.filters.all")}</option>
              <option value="gpt-4o">{t("admin.usage.models.gpt_4o")}</option>
              <option value="deepseek/deepseek-r1-0528:free">{t("admin.usage.models.deepseek_r1_0528")}</option>
              <option value="sonar">{t("admin.usage.models.sonar")}</option>
              <option value="sonar-reasoning">{t("admin.usage.models.sonar_reasoning")}</option>
              <option value="sonar-reasoning-pro">{t("admin.usage.models.sonar_reasoning_pro")}</option>
              <option value="sonar-deep-research">{t("admin.usage.models.sonar_deep_research")}</option>
              <option value="claude-haiku-4-5">{t("admin.usage.models.claude_haiku_4_5")}</option>
              <option value="claude-sonnet-4-5">{t("admin.usage.models.claude_sonnet_4_5")}</option>
              <option value="claude-opus-4-5">{t("admin.usage.models.claude_opus_4_5")}</option>
              <option value="gemini-2.5-flash-lite">{t("admin.usage.models.gemini_2_5_flash_lite")}</option>
              <option value="gemini-2.5-flash">{t("admin.usage.models.gemini_2_5_flash")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">{t("admin.usage.filters.start")}</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">{t("admin.usage.filters.end")}</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm shadow-sm hover:opacity-90"
            disabled={loading}
          >
            {loading ? t("common.loading") : t("admin.usage.filters.apply")}
          </button>
          {errorText && <span className="text-red-600 text-sm">{errorText}</span>}
        </div>

        {/* Card da tabela */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/80 backdrop-blur sticky top-0 z-10">
                <tr className="text-xs uppercase tracking-wide text-gray-600">
                  <th className="text-left px-4 py-3">{t("admin.usage.table.user")}</th>
                  <th className="text-left px-4 py-3">{t("admin.usage.table.email")}</th>
                  <th className="text-right px-4 py-3">{t("admin.usage.table.prompt")}</th>
                  <th className="text-right px-4 py-3">{t("admin.usage.table.completion")}</th>
                  <th className="text-right px-4 py-3">{t("admin.usage.table.total")}</th>
                  <th className="text-right px-4 py-3">{t("admin.usage.table.quota")}</th>
                  <th className="text-right px-4 py-3">{t("admin.usage.table.remaining")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const used = r.total_tokens ?? 0;
                  const quota = r.quota_monthly ?? 0;
                  const left = quota ? Math.max(quota - used, 0) : null;
                  const p = pct(used, quota);
                  return (
                    <tr key={r.user_id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.full_name || r.username || r.user_id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.email || placeholder}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.prompt_tokens)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.completion_tokens)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                          {fmt(used)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{quota ? fmt(quota) : placeholder}</td>
                      <td className="px-4 py-3 text-right">
                        {quota ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="text-sm font-medium">{fmt(left)}</span>
                            <div className="mt-1 w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-primary)]"
                                style={{ width: `${p}%` }}
                                title={t("admin.usage.table.used_percent", { percent: p })}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">{placeholder}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!rows.length && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10">
                      <div className="flex flex-col items-center justify-center text-center text-gray-500">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">{t("admin.usage.empty.icon")}</div>
                        <div className="font-medium">{t("admin.usage.empty.title")}</div>
                        <div className="text-xs">{t("admin.usage.empty.description")}</div>
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
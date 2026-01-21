import { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import { adminRoutes } from "../../services/apiRoutes";

export default function AdminUsage() {
  const [rows, setRows] = useState([]);
  const [model, setModel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
  const pct = (used, quota) =>
    quota ? Math.min(100, Math.round(((used ?? 0) / quota) * 100)) : null;

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (model) params.set("model", model);
      if (start) params.set("start", start);
      if (end) params.set("end", end);
  
      const res = await fetch(adminRoutes.usage(params.toString()), {
        credentials: "include",
        cache: "no-store",
      });
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Falha ao carregar relatório (${res.status})`);
      }
  
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(text || "Resposta não é JSON");
      }
  
      const j = await res.json();
      setRows(j.results || []);
    } catch (e) {
      setError(e.message || "Erro ao carregar dados");
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
          <h1 className="text-2xl font-semibold">Relatório de Uso de Tokens</h1>
          {/* extra: botão de exportação (opcional) */}
          {/* <button className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
            Exportar CSV
          </button> */}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500">Modelo</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Todos</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="deepseek/deepseek-r1-0528:free">DeepSeek R1 0528</option>
              <option value="sonar">Sonar</option>
              <option value="sonar-reasoning">Sonar Reasoning</option>
              <option value="sonar-reasoning-pro">Sonar Reasoning Pro</option>
              <option value="sonar-deep-research">Sonar Deep Research</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
              <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
              <option value="claude-opus-4-5">Claude Opus 4.5</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Início</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Fim</label>
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
            {loading ? "Carregando..." : "Filtrar"}
          </button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>

        {/* Card da tabela */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/80 backdrop-blur sticky top-0 z-10">
                <tr className="text-xs uppercase tracking-wide text-gray-600">
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-right px-4 py-3">Prompt</th>
                  <th className="text-right px-4 py-3">Completion</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Cota</th>
                  <th className="text-right px-4 py-3">Restante</th>
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
                      <td className="px-4 py-3 text-gray-600">{r.email || "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.prompt_tokens)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.completion_tokens)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                          {fmt(used)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{quota ? fmt(quota) : "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {quota ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="text-sm font-medium">{fmt(left)}</span>
                            <div className="mt-1 w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-primary)]"
                                style={{ width: `${p}%` }}
                                title={`${p}% usado`}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!rows.length && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10">
                      <div className="flex flex-col items-center justify-center text-center text-gray-500">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">📄</div>
                        <div className="font-medium">Sem dados para os filtros.</div>
                        <div className="text-xs">Ajuste o período ou selecione outro modelo.</div>
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                      Carregando...
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
import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import { apiFetch } from "../../../services/apiService";
import { generatedContentRoutes } from "../../../services/apiRoutes";
import { toast } from "react-toastify";

export default function ProEmpresaApprovals() {
  const { checkFeatureAccess } = useFeatureRestriction();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [mine, setMine] = useState([]);
  const [inboxInReview, setInboxInReview] = useState([]);
  const [inboxFinalized, setInboxFinalized] = useState([]);
  const [inboxTab, setInboxTab] = useState("in_review"); // in_review | finalized
  const [canReviewInbox, setCanReviewInbox] = useState(true);

  useEffect(() => {
    checkFeatureAccess("collab_approval_flow");
  }, [checkFeatureAccess]);

  async function loadMine() {
    setLoadingMine(true);
    try {
      const data = await apiFetch(generatedContentRoutes.list);
      const arr = Array.isArray(data) ? data : [];
      // MVP: só textos participam do fluxo
      setMine(arr.filter((c) => c.content_type === "text"));
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.approvals.toast.load_error"));
    } finally {
      setLoadingMine(false);
    }
  }

  async function loadInbox() {
    setLoadingInbox(true);
    setCanReviewInbox(true);
    try {
      // Carrega ambos para permitir contagem + UX melhor
      const [inReview, finalized] = await Promise.all([
        apiFetch(generatedContentRoutes.reviewInbox("status=in_review")),
        apiFetch(generatedContentRoutes.reviewInbox("status=approved,rejected")),
      ]);

      const safeInReview = Array.isArray(inReview) ? inReview : [];
      const safeFinalized = Array.isArray(finalized) ? finalized : [];
      setInboxInReview(safeInReview);
      setInboxFinalized(safeFinalized);

      // Se não há itens em revisão, mas há finalizados, troca automaticamente para "Finalizados"
      if (inboxTab === "in_review" && safeInReview.length === 0 && safeFinalized.length > 0) {
        setInboxTab("finalized");
      }
    } catch (e) {
      const msg = (e?.message || "").toString().toLowerCase();
      const looksLikePermissionError =
        msg.includes("permiss") ||
        msg.includes("acesso negado") ||
        msg.includes("restricted") ||
        msg.includes("administrador") ||
        msg.includes("admin");

      if (looksLikePermissionError) {
        setCanReviewInbox(false);
        setInboxInReview([]);
        setInboxFinalized([]);
      } else {
        toast.error(e?.message || t("pro_empresa.approvals.toast.inbox_error"));
      }
    } finally {
      setLoadingInbox(false);
    }
  }

  useEffect(() => {
    loadMine();
    loadInbox();
  }, [user?.id, inboxTab]);

  const mineDraft = useMemo(() => mine.filter((c) => c.status === "draft"), [mine]);
  const mineRejected = useMemo(() => mine.filter((c) => c.status === "rejected"), [mine]);

  const mineInReview = useMemo(
    () => mine.filter((c) => c.status === "in_review"),
    [mine]
  );

  const mineApproved = useMemo(
    () => mine.filter((c) => c.status === "approved"),
    [mine]
  );

  const inbox = useMemo(() => {
    return inboxTab === "finalized" ? inboxFinalized : inboxInReview;
  }, [inboxFinalized, inboxInReview, inboxTab]);

  async function submit(contentId) {
    try {
      await apiFetch(generatedContentRoutes.submitReview(contentId), { method: "POST" });
      await loadMine();
      await loadInbox();
      toast.success(t("pro_empresa.approvals.toast.sent"));
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.approvals.toast.send_error"));
    }
  }

  async function approve(contentId) {
    try {
      await apiFetch(generatedContentRoutes.approve(contentId), { method: "POST" });
      await loadInbox();
      toast.success(t("pro_empresa.approvals.toast.approved"));
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.approvals.toast.approve_error"));
    }
  }

  async function reject(contentId) {
    try {
      await apiFetch(generatedContentRoutes.reject(contentId), { method: "POST" });
      await loadInbox();
      toast.success(t("pro_empresa.approvals.toast.rejected"));
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.approvals.toast.reject_error"));
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t("pro_empresa.approvals.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("pro_empresa.approvals.subtitle")}
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">{t("pro_empresa.approvals.my_texts")}</div>
                <button
                  onClick={loadMine}
                  className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                >
                  {t("pro_empresa.approvals.refresh")}
                </button>
              </div>

              <div className="mt-3">
                {loadingMine ? (
                  <div className="text-sm text-gray-500">Carregando…</div>
                ) : (
                  <>
                    <div className="text-xs text-gray-500 mb-2">
                      {t("pro_empresa.approvals.section.draft")}
                    </div>
                    {mineDraft.length === 0 ? (
                      <div className="text-sm text-gray-500">{t("pro_empresa.approvals.empty.nothing_to_send")}</div>
                    ) : (
                      <div className="space-y-2">
                        {mineDraft.map((c) => (
                          <ItemRow
                            key={c.id}
                            item={c}
                            right={
                              <button
                                onClick={() => submit(c.id)}
                                className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                              >
                                {t("pro_empresa.approvals.action.send")}
                              </button>
                            }
                          />
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-4 mb-2">
                      {t("pro_empresa.approvals.section.rejected")}
                    </div>
                    {mineRejected.length === 0 ? (
                      <div className="text-sm text-gray-500">{t("pro_empresa.approvals.empty.none_rejected")}</div>
                    ) : (
                      <div className="space-y-2">
                        {mineRejected.map((c) => (
                          <ItemRow
                            key={c.id}
                            item={c}
                            right={
                              <button
                                onClick={() => submit(c.id)}
                                className="text-xs px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                              >
                                {t("pro_empresa.approvals.action.resubmit")}
                              </button>
                            }
                          />
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-4 mb-2">
                      {t("pro_empresa.approvals.section.in_review")}
                    </div>
                    {mineInReview.length === 0 ? (
                      <div className="text-sm text-gray-500">{t("pro_empresa.approvals.empty.none_in_review")}</div>
                    ) : (
                      <div className="space-y-2">
                        {mineInReview.map((c) => (
                          <ItemRow
                            key={c.id}
                            item={c}
                            right={<span className="text-xs text-amber-700">{t("pro_empresa.approvals.state.waiting")}</span>}
                          />
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-4 mb-2">
                      {t("pro_empresa.approvals.section.history_approved")}
                    </div>
                    {mineApproved.length === 0 ? (
                      <div className="text-sm text-gray-500">{t("pro_empresa.approvals.empty.none_approved")}</div>
                    ) : (
                      <div className="space-y-2">
                        {mineApproved.map((c) => (
                          <ItemRow
                            key={c.id}
                            item={c}
                            right={<span className="text-xs text-green-700">{t("pro_empresa.status.approved")}</span>}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">{t("pro_empresa.approvals.to_review")}</div>
                <button
                  onClick={loadInbox}
                  disabled={!canReviewInbox}
                  className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {t("pro_empresa.approvals.refresh")}
                </button>
              </div>
              {!canReviewInbox ? (
                <div className="mt-3 text-sm text-gray-500">
                  {t("pro_empresa.approvals.admin_only")}
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setInboxTab("in_review")}
                      className={`text-xs px-2 py-1 rounded-md border ${
                        inboxTab === "in_review"
                          ? "border-blue-300 bg-blue-50 text-blue-800"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("pro_empresa.approvals.tab.in_review")}{typeof inboxInReview?.length === "number" ? ` (${inboxInReview.length})` : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInboxTab("finalized")}
                      className={`text-xs px-2 py-1 rounded-md border ${
                        inboxTab === "finalized"
                          ? "border-blue-300 bg-blue-50 text-blue-800"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("pro_empresa.approvals.tab.finalized")}{typeof inboxFinalized?.length === "number" ? ` (${inboxFinalized.length})` : ""}
                    </button>
                  </div>
                  {loadingInbox ? (
                    <div className="text-sm text-gray-500">{t("common.loading")}</div>
                  ) : inbox.length === 0 ? (
                    <div className="text-sm text-gray-500">{t("pro_empresa.approvals.empty.inbox")}</div>
                  ) : (
                    <div className="space-y-2">
                      {inbox.map((c) => (
                        <ItemRow
                          key={c.id}
                          item={c}
                          right={
                            inboxTab === "finalized" ? (
                              <span
                                className={`text-xs font-medium ${
                                  c.status === "approved"
                                    ? "text-green-700"
                                    : "text-red-700"
                                }`}
                              >
                                {c.status === "approved"
                                  ? t("pro_empresa.status.approved")
                                  : t("pro_empresa.status.rejected")}
                              </span>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approve(c.id)}
                                  className="text-xs px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
                                >
                                  {t("pro_empresa.approvals.action.approve")}
                                </button>
                                <button
                                  onClick={() => reject(c.id)}
                                  className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                                >
                                  {t("pro_empresa.approvals.action.reject")}
                                </button>
                              </div>
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ItemRow({ item, right }) {
  const { t } = useLanguage();
  const statusKey = `pro_empresa.status.${item.status || "draft"}`;
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {item.prompt?.slice(0, 60) || t("common.no_prompt")}
        </div>
        <div className="text-xs text-gray-500">
          {t("pro_empresa.status.label")}{" "}
          <span className="font-medium">{t(statusKey)}</span>
        </div>
      </div>
      <div className="ml-3 flex-shrink-0">{right}</div>
    </div>
  );
}

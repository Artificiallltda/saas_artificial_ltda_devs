import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../services/apiService";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import { generatedContentRoutes, integrationRoutes } from "../../../services/apiRoutes";
import { toast } from "react-toastify";
import ConfirmModal from "../../../components/modals/ConfirmModal";

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
  const [reviewFilterWorkspaceId, setReviewFilterWorkspaceId] = useState("");
  const [confirmAction, setConfirmAction] = useState({ isOpen: false, type: null, contentId: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  const workspacesWithCount = useMemo(() => {
    const map = new Map();
    (inboxInReview || []).forEach((c) => {
      const infos = c?.workspace_infos || [];
      infos.forEach((w) => {
        if (w?.id && w?.name) {
          map.set(w.id, { id: w.id, name: w.name, count: (map.get(w.id)?.count || 0) + 1 });
        }
      });
      if (infos.length === 0 && (c?.workspace_ids || []).length > 0) {
        (c.workspace_ids || []).forEach((wid) => {
          map.set(wid, { id: wid, name: wid, count: (map.get(wid)?.count || 0) + 1 });
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [inboxInReview]);

  const inboxFiltered = useMemo(() => {
    if (!reviewFilterWorkspaceId || inboxTab === "finalized") return inbox;
    return inbox.filter((c) => {
      const ids = c?.workspace_infos?.map((w) => w.id) || c?.workspace_ids || [];
      return ids.includes(reviewFilterWorkspaceId);
    });
  }, [inbox, inboxTab, reviewFilterWorkspaceId]);

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

  function openApproveConfirm(contentId) {
    setConfirmAction({ isOpen: true, type: "approve", contentId });
  }

  function openRejectConfirm(contentId) {
    setConfirmAction({ isOpen: true, type: "reject", contentId });
  }

  async function runConfirmAction() {
    const { type, contentId } = confirmAction;
    if (!contentId) return;
    setConfirmLoading(true);
    try {
      if (type === "approve") {
        await apiFetch(generatedContentRoutes.approve(contentId), { method: "POST" });
        toast.success(t("pro_empresa.approvals.toast.approved"));
      } else {
        await apiFetch(generatedContentRoutes.reject(contentId), { method: "POST" });
        toast.success(t("pro_empresa.approvals.toast.rejected"));
      }
      await loadInbox();
      setConfirmAction({ isOpen: false, type: null, contentId: null });
    } catch (e) {
      const msg = e?.message || (type === "approve" ? t("pro_empresa.approvals.toast.approve_error") : t("pro_empresa.approvals.toast.reject_error"));
      toast.error(msg);
    } finally {
      setConfirmLoading(false);
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
                            right={
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-700">{t("pro_empresa.status.approved")}</span>
                                <PublishWordPressButton
                                  contentId={c.id}
                                  wordpress={c.wordpress}
                                  onPublished={() => {
                                    loadMine();
                                    loadInbox();
                                  }}
                                />
                              </div>
                            }
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
                  {inboxTab === "in_review" && workspacesWithCount.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1">{t("pro_empresa.approvals.filter.workspace")}</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewFilterWorkspaceId("")}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            !reviewFilterWorkspaceId
                              ? "border-blue-300 bg-blue-50 text-blue-800"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {t("pro_empresa.approvals.filter.all")}{" "}
                          <span className="font-medium">({inboxInReview?.length || 0})</span>
                        </button>
                        {workspacesWithCount.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setReviewFilterWorkspaceId(w.id)}
                            className={`text-xs px-2 py-1 rounded-full border ${
                              reviewFilterWorkspaceId === w.id
                                ? "border-blue-300 bg-blue-50 text-blue-800"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {w.name} <span className="font-medium">({w.count})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                  ) : inboxFiltered.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      {reviewFilterWorkspaceId
                        ? t("pro_empresa.approvals.empty.inbox_filtered")
                        : t("pro_empresa.approvals.empty.inbox")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inboxFiltered.map((c) => (
                        <ItemRow
                          key={c.id}
                          item={c}
                          workspaceInfos={c?.workspace_infos}
                          right={
                            inboxTab === "finalized" ? (
                              <div className="flex items-center gap-2">
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
                                {c.status === "approved" && (
                                  <PublishWordPressButton
                                    contentId={c.id}
                                    wordpress={c.wordpress}
                                    onPublished={() => {
                                      loadMine();
                                      loadInbox();
                                    }}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openApproveConfirm(c.id)}
                                  className="text-xs px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
                                >
                                  {t("pro_empresa.approvals.action.approve")}
                                </button>
                                <button
                                  onClick={() => openRejectConfirm(c.id)}
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

      <ConfirmModal
        isOpen={confirmAction.isOpen}
        onClose={() => {
          if (!confirmLoading) setConfirmAction({ isOpen: false, type: null, contentId: null });
        }}
        title={
          confirmAction.type === "approve"
            ? t("pro_empresa.approvals.confirm.approve_title")
            : t("pro_empresa.approvals.confirm.reject_title")
        }
        description={
          confirmAction.type === "approve"
            ? t("pro_empresa.approvals.confirm.approve_description")
            : t("pro_empresa.approvals.confirm.reject_description")
        }
        confirmText={confirmAction.type === "approve" ? t("pro_empresa.approvals.action.approve") : t("pro_empresa.approvals.action.reject")}
        cancelText={t("common.cancel")}
        variant={confirmAction.type === "reject" ? "danger" : "primary"}
        loading={confirmLoading}
        onConfirm={runConfirmAction}
      />
    </Layout>
  );
}

function ItemRow({ item, right, workspaceInfos }) {
  const { t } = useLanguage();
  const statusKey = `pro_empresa.status.${item.status || "draft"}`;
  const workspaceNames = (workspaceInfos || []).map((w) => w.name).filter(Boolean).join(", ");
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
        {workspaceNames && (
          <div className="text-xs text-gray-400 mt-0.5">
            {t("pro_empresa.approvals.workspace_label")}: {workspaceNames}
          </div>
        )}
      </div>
      <div className="ml-3 flex-shrink-0">{right}</div>
    </div>
  );
}

function PublishWordPressButton({ contentId, wordpress, onPublished }) {
  const { t } = useLanguage();
  const [publishing, setPublishing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [publishStatus, setPublishStatus] = useState("draft");

  const alreadyPublished = wordpress?.post_url;

  async function handlePublish() {
    setPublishing(true);
    try {
      await apiFetch(integrationRoutes.wordpress.publish, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: contentId,
          publish_status: publishStatus,
        }),
      });
      toast.success(t("pro_empresa.integrations.toast.published"));
      setShowModal(false);
      onPublished?.();
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.integrations.toast.publish_error"));
    } finally {
      setPublishing(false);
    }
  }

  if (alreadyPublished) {
    const statusKey = wordpress.publish_status === "publish"
      ? "pro_empresa.integrations.published_live"
      : "pro_empresa.integrations.published_draft";
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">{t(statusKey)}</span>
        <a
          href={wordpress.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          {t("pro_empresa.integrations.view_on_wordpress")}
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        title={t("pro_empresa.integrations.publish_wordpress")}
      >
        {t("pro_empresa.integrations.publish_wordpress")}
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("pro_empresa.integrations.publish_modal.title")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("pro_empresa.integrations.publish_modal.status")}
                </label>
                <select
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">{t("pro_empresa.integrations.publish_modal.draft")}</option>
                  <option value="publish">{t("pro_empresa.integrations.publish_modal.publish")}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {publishing ? t("common.publishing") : t("common.publish")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

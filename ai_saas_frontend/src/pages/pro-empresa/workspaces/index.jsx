import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { apiFetch } from "../../../services/apiService";
import { projectRoutes, workspaceRoutes } from "../../../services/apiRoutes";
import { toast } from "react-toastify";
import { useLanguage } from "../../../context/LanguageContext";
import ConfirmModal from "../../../components/modals/ConfirmModal";
import { useAuth } from "../../../context/AuthContext";

export default function ProEmpresaWorkspaces() {
  const { checkFeatureAccess } = useFeatureRestriction();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("team");

  const [allProjectsLoading, setAllProjectsLoading] = useState(false);
  const [allProjects, setAllProjects] = useState([]);

  const [expandedId, setExpandedId] = useState(null);
  const [workspaceProjects, setWorkspaceProjects] = useState({}); // { [workspaceId]: Project[] }
  const [workspaceProjectsLoading, setWorkspaceProjectsLoading] = useState({}); // { [workspaceId]: boolean }
  const [selectedProjectByWorkspace, setSelectedProjectByWorkspace] = useState({}); // { [workspaceId]: projectId }

  const [workspaceMembers, setWorkspaceMembers] = useState({}); // { [workspaceId]: Member[] }
  const [workspaceMembersLoading, setWorkspaceMembersLoading] = useState({}); // { [workspaceId]: boolean }
  const [memberIdentifierByWorkspace, setMemberIdentifierByWorkspace] = useState({}); // { [workspaceId]: string }
  const [memberRoleByWorkspace, setMemberRoleByWorkspace] = useState({}); // { [workspaceId]: role }

  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    cancelText: "",
    variant: "primary",
    onConfirm: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  async function loadAllProjects() {
    setAllProjectsLoading(true);
    try {
      const data = await apiFetch(projectRoutes.list);
      setAllProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.workspaces.toast.load_projects_error"));
    } finally {
      setAllProjectsLoading(false);
    }
  }

  useEffect(() => {
    loadAllProjects();
  }, []);

  async function loadWorkspaceProjects(workspaceId) {
    setWorkspaceProjectsLoading((prev) => ({ ...prev, [workspaceId]: true }));
    try {
      const data = await apiFetch(workspaceRoutes.projects(workspaceId));
      setWorkspaceProjects((prev) => ({ ...prev, [workspaceId]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.workspaces.toast.load_workspace_projects_error"));
    } finally {
      setWorkspaceProjectsLoading((prev) => ({ ...prev, [workspaceId]: false }));
    }
  }

  async function loadWorkspaceMembers(workspaceId) {
    setWorkspaceMembersLoading((prev) => ({ ...prev, [workspaceId]: true }));
    try {
      const data = await apiFetch(workspaceRoutes.members(workspaceId));
      setWorkspaceMembers((prev) => ({ ...prev, [workspaceId]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.workspaces.toast.load_members_error"));
    } finally {
      setWorkspaceMembersLoading((prev) => ({ ...prev, [workspaceId]: false }));
    }
  }

  async function toggleWorkspace(workspaceId) {
    const next = expandedId === workspaceId ? null : workspaceId;
    setExpandedId(next);
    if (next && !workspaceProjects[next]) {
      await loadWorkspaceProjects(next);
    }
    if (next && !workspaceMembers[next]) {
      await loadWorkspaceMembers(next);
    }
  }

  async function handleMoveProjectToWorkspace(projectId, workspaceId) {
    if (!projectId) return;

    const proj = allProjects.find((p) => p.id === projectId);
    if (!proj) return;

    const doMove = async () => {
      try {
        await apiFetch(projectRoutes.update(projectId), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: workspaceId }),
        });
        toast.success(t("pro_empresa.workspaces.toast.project_moved"));
        setSelectedProjectByWorkspace((prev) => ({ ...prev, [workspaceId]: "" }));
        await Promise.all([loadAllProjects(), loadWorkspaceProjects(workspaceId)]);
      } catch (e) {
        toast.error(e?.message || t("pro_empresa.workspaces.toast.project_move_error"));
      }
    };

    if (proj.workspace_id && proj.workspace_id !== workspaceId) {
      setConfirm({
        isOpen: true,
        title: t("pro_empresa.workspaces.modal.move_project.title"),
        description: t("pro_empresa.workspaces.confirm_move_project"),
        confirmText: t("common.confirm"),
        cancelText: t("common.cancel"),
        variant: "primary",
        onConfirm: doMove,
      });
      return;
    }

    await doMove();
  }

  async function handleRemoveProjectFromWorkspace(projectId, workspaceId) {
    const doRemove = async () => {
      try {
        await apiFetch(projectRoutes.update(projectId), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: null }),
        });
        toast.success(t("pro_empresa.workspaces.toast.project_removed"));
        await Promise.all([loadAllProjects(), loadWorkspaceProjects(workspaceId)]);
      } catch (e) {
        toast.error(e?.message || t("pro_empresa.workspaces.toast.project_remove_error"));
      }
    };

    setConfirm({
      isOpen: true,
      title: t("pro_empresa.workspaces.modal.remove_project.title"),
      description: t("pro_empresa.workspaces.confirm_remove_project"),
      confirmText: t("common.remove"),
      cancelText: t("common.cancel"),
      variant: "danger",
      onConfirm: doRemove,
    });
  }

  async function handleAddMember(workspaceId) {
    const ws = items.find((x) => x.id === workspaceId);
    if (ws && authUser?.id && ws.user_id !== authUser.id) {
      toast.error(t("pro_empresa.workspaces.toast.only_owner_manage_members"));
      return;
    }

    const identifier = (memberIdentifierByWorkspace[workspaceId] || "").trim();
    const role = (memberRoleByWorkspace[workspaceId] || "editor").trim();
    if (!identifier) return;

    // MVP UX: adicionar apenas por email (mais simples e evita confusão com username).
    if (!identifier.includes("@")) {
      toast.error(t("pro_empresa.workspaces.toast.invalid_member_email"));
      return;
    }

    try {
      await apiFetch(workspaceRoutes.members(workspaceId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, role }),
      });
      toast.success(t("pro_empresa.workspaces.toast.member_added"));
      setMemberIdentifierByWorkspace((prev) => ({ ...prev, [workspaceId]: "" }));
      setMemberRoleByWorkspace((prev) => ({ ...prev, [workspaceId]: "editor" }));
      await loadWorkspaceMembers(workspaceId);
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.workspaces.toast.member_add_error"));
    }
  }

  async function handleChangeMemberRole(workspaceId, memberUserId, nextRole) {
    const ws = items.find((x) => x.id === workspaceId);
    if (ws && authUser?.id && ws.user_id !== authUser.id) {
      toast.error(t("pro_empresa.workspaces.toast.only_owner_manage_members"));
      return;
    }
    try {
      await apiFetch(workspaceRoutes.updateMember(workspaceId, memberUserId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      toast.success(t("pro_empresa.workspaces.toast.member_role_updated"));
      await loadWorkspaceMembers(workspaceId);
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.workspaces.toast.member_role_update_error"));
    }
  }

  async function handleRemoveMember(workspaceId, memberUserId) {
    const ws = items.find((x) => x.id === workspaceId);
    if (ws && authUser?.id && ws.user_id !== authUser.id) {
      toast.error(t("pro_empresa.workspaces.toast.only_owner_manage_members"));
      return;
    }
    const doRemove = async () => {
      try {
        await apiFetch(workspaceRoutes.removeMember(workspaceId, memberUserId), { method: "DELETE" });
        toast.success(t("pro_empresa.workspaces.toast.member_removed"));
        await loadWorkspaceMembers(workspaceId);
      } catch (e) {
        toast.error(e?.message || t("pro_empresa.workspaces.toast.member_remove_error"));
      }
    };

    setConfirm({
      isOpen: true,
      title: t("pro_empresa.workspaces.modal.remove_member.title"),
      description: t("pro_empresa.workspaces.confirm_remove_member"),
      confirmText: t("common.remove"),
      cancelText: t("common.cancel"),
      variant: "danger",
      onConfirm: doRemove,
    });
  }

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
    const doDelete = async () => {
      try {
        await apiFetch(workspaceRoutes.delete(id), { method: "DELETE" });
        await load();
        toast.success(t("pro_empresa.workspaces.toast.removed"));
      } catch (e) {
        toast.error(e?.message || t("pro_empresa.workspaces.toast.remove_error"));
      }
    };

    setConfirm({
      isOpen: true,
      title: t("pro_empresa.workspaces.modal.remove_workspace.title"),
      description: t("pro_empresa.workspaces.confirm_remove"),
      confirmText: t("common.remove"),
      cancelText: t("common.cancel"),
      variant: "danger",
      onConfirm: doDelete,
    });
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
                      <div key={w.id} className="rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between p-3">
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleWorkspace(w.id)}
                              className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                            >
                              {expandedId === w.id
                                ? t("pro_empresa.workspaces.projects.hide")
                                : t("pro_empresa.workspaces.projects.view")}
                            </button>
                            <button
                              onClick={() => handleDelete(w.id)}
                              className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                            >
                              {t("pro_empresa.workspaces.remove")}
                            </button>
                          </div>
                        </div>

                        {expandedId === w.id && (
                          <div className="border-t border-gray-200 p-3 space-y-3">
                            <div className="text-sm font-semibold text-gray-900">
                              {t("pro_empresa.workspaces.projects.title")}
                            </div>

                            <div className="rounded-lg border border-gray-200 p-3 bg-white">
                              <div className="text-xs font-semibold text-gray-700">
                                {t("pro_empresa.workspaces.projects.add.title")}
                              </div>
                              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                <select
                                  value={selectedProjectByWorkspace[w.id] || ""}
                                  onChange={(e) =>
                                    setSelectedProjectByWorkspace((prev) => ({
                                      ...prev,
                                      [w.id]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white"
                                  disabled={allProjectsLoading}
                                >
                                  <option value="">
                                    {allProjectsLoading
                                      ? t("common.loading")
                                      : t("pro_empresa.workspaces.projects.add.placeholder")}
                                  </option>
                                  {allProjects
                                    .filter((p) => p.workspace_id !== w.id)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  onClick={() =>
                                    handleMoveProjectToWorkspace(selectedProjectByWorkspace[w.id], w.id)
                                  }
                                  disabled={!selectedProjectByWorkspace[w.id]}
                                  className="h-10 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                                >
                                  {t("pro_empresa.workspaces.projects.add.cta")}
                                </button>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                {t("pro_empresa.workspaces.projects.add.hint")}
                              </div>
                            </div>

                            {workspaceProjectsLoading[w.id] ? (
                              <div className="text-sm text-gray-500">{t("common.loading")}</div>
                            ) : (workspaceProjects[w.id] || []).length === 0 ? (
                              <div className="text-sm text-gray-500">
                                {t("pro_empresa.workspaces.projects.empty")}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {(workspaceProjects[w.id] || []).map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {p.name}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {p.description || t("common.no_description")}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveProjectFromWorkspace(p.id, w.id)}
                                      className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                                    >
                                      {t("pro_empresa.workspaces.projects.remove")}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="pt-2">
                              <div className="text-sm font-semibold text-gray-900">
                                {t("pro_empresa.workspaces.members.title")}
                              </div>
                              <div className="mt-2 rounded-lg border border-gray-200 p-3 bg-white space-y-2">
                                <div className="text-xs font-semibold text-gray-700">
                                  {t("pro_empresa.workspaces.members.add.title")}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    value={memberIdentifierByWorkspace[w.id] || ""}
                                    onChange={(e) =>
                                      setMemberIdentifierByWorkspace((prev) => ({
                                        ...prev,
                                        [w.id]: e.target.value,
                                      }))
                                    }
                                    className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white"
                                    placeholder={t("pro_empresa.workspaces.members.add.placeholder")}
                                    disabled={authUser?.id && w.user_id !== authUser.id}
                                  />
                                  <select
                                    value={memberRoleByWorkspace[w.id] || "editor"}
                                    onChange={(e) =>
                                      setMemberRoleByWorkspace((prev) => ({
                                        ...prev,
                                        [w.id]: e.target.value,
                                      }))
                                    }
                                    className="h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white"
                                    disabled={authUser?.id && w.user_id !== authUser.id}
                                  >
                                    <option value="admin">{t("pro_empresa.workspaces.members.roles.admin")}</option>
                                    <option value="editor">{t("pro_empresa.workspaces.members.roles.editor")}</option>
                                    <option value="reviewer">{t("pro_empresa.workspaces.members.roles.reviewer")}</option>
                                  </select>
                                  <button
                                    onClick={() => handleAddMember(w.id)}
                                    disabled={
                                      (authUser?.id && w.user_id !== authUser.id) ||
                                      !((memberIdentifierByWorkspace[w.id] || "").trim().length > 5)
                                    }
                                    className="h-10 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                                  >
                                    {t("pro_empresa.workspaces.members.add.cta")}
                                  </button>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {t("pro_empresa.workspaces.members.add.hint")}
                                </div>
                              </div>

                              <div className="mt-2">
                                {workspaceMembersLoading[w.id] ? (
                                  <div className="text-sm text-gray-500">{t("common.loading")}</div>
                                ) : (workspaceMembers[w.id] || []).length === 0 ? (
                                  <div className="text-sm text-gray-500">
                                    {t("pro_empresa.workspaces.members.empty")}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {(workspaceMembers[w.id] || []).map((m) => (
                                      <div
                                        key={`${m.user_id}-${m.role}-${m.is_owner ? "owner" : "member"}`}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 p-3 bg-white"
                                      >
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-gray-900 truncate">
                                            {m.full_name || m.username || m.email || m.user_id}
                                          </div>
                                          <div className="text-xs text-gray-500 truncate">
                                            {m.email || m.username || m.user_id}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">
                                            {t("pro_empresa.workspaces.members.role_label")}:
                                          </span>
                                          {m.is_owner ? (
                                            <span className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-gray-50">
                                              {t("pro_empresa.workspaces.members.roles.owner")}
                                            </span>
                                          ) : (
                                            <select
                                              value={m.role}
                                              onChange={(e) => handleChangeMemberRole(w.id, m.user_id, e.target.value)}
                                              className="h-8 px-2 rounded-md border border-gray-300 text-xs bg-white"
                                              disabled={authUser?.id && w.user_id !== authUser.id}
                                            >
                                              <option value="admin">
                                                {t("pro_empresa.workspaces.members.roles.admin")}
                                              </option>
                                              <option value="editor">
                                                {t("pro_empresa.workspaces.members.roles.editor")}
                                              </option>
                                              <option value="reviewer">
                                                {t("pro_empresa.workspaces.members.roles.reviewer")}
                                              </option>
                                            </select>
                                          )}

                                          {!m.is_owner && (
                                            <button
                                              onClick={() => handleRemoveMember(w.id, m.user_id)}
                                              disabled={authUser?.id && w.user_id !== authUser.id}
                                              className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                                            >
                                              {t("common.remove")}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={() => {
          if (confirmLoading) return;
          setConfirm((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
        }}
        title={confirm.title}
        description={confirm.description}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        variant={confirm.variant}
        loading={confirmLoading}
        onConfirm={async () => {
          if (!confirm.onConfirm) return;
          setConfirmLoading(true);
          try {
            await confirm.onConfirm();
          } finally {
            setConfirmLoading(false);
            setConfirm((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
          }
        }}
      />
    </Layout>
  );
}


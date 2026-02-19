import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/layout/Layout";
import { useFeatureRestriction } from "../../../hooks/useFeatureRestriction";
import { useLanguage } from "../../../context/LanguageContext";
import { apiFetch } from "../../../services/apiService";
import { companyRoutes } from "../../../services/apiRoutes";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { Link } from "react-router-dom";
import CustomSelect from "../../../components/common/CustomSelect";

export default function ProEmpresaCompany() {
  const { checkFeatureAccess } = useFeatureRestriction();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [company, setCompany] = useState(null);
  const [myCompanyRole, setMyCompanyRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [inviteStatusFilter, setInviteStatusFilter] = useState("pending");
  const [bootstrapName, setBootstrapName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [loadingInvites, setLoadingInvites] = useState(true);

  const isOwner = (myCompanyRole || "").toLowerCase() === "owner";
  const isCompanyAdmin = (myCompanyRole || "").toLowerCase() === "admin";
  const canManageCompany = isOwner || isCompanyAdmin;

  useEffect(() => {
    checkFeatureAccess("pro_empresa");
  }, [checkFeatureAccess]);

  async function loadCompany() {
    setLoading(true);
    try {
      const data = await apiFetch(companyRoutes.me);
      setCompany(data?.company || null);
      setMyCompanyRole(data?.company_role || null);
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.company.toast.load_company_error"));
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const data = await apiFetch(companyRoutes.users);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      // para membro comum, esse endpoint pode retornar 403
      const msg = (e?.message || "").toString();
      if (msg.toLowerCase().includes("acesso")) {
        setUsers([]);
      } else {
        toast.error(e?.message || t("pro_empresa.company.toast.load_users_error"));
      }
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadInvites(statusArg = inviteStatusFilter) {
    if (!canManageCompany || !company?.id) {
      setInvites([]);
      setPendingInvitesCount(0);
      setLoadingInvites(false);
      return;
    }
    setLoadingInvites(true);
    try {
      const safeStatus = (statusArg || "pending").toLowerCase();
      const data = await apiFetch(`${companyRoutes.invites}?status=${encodeURIComponent(safeStatus)}`);
      const list = Array.isArray(data) ? data : [];
      setInvites(list);
      if (safeStatus === "pending") {
        setPendingInvitesCount(list.length);
      } else {
        const pending = await apiFetch(`${companyRoutes.invites}?status=pending`);
        setPendingInvitesCount(Array.isArray(pending) ? pending.length : 0);
      }
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.company.toast.load_invites_error"));
    } finally {
      setLoadingInvites(false);
    }
  }

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    // só tenta listar usuários se já tem company
    if (company?.id) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  useEffect(() => {
    if (company?.id && canManageCompany) {
      loadInvites(inviteStatusFilter);
    } else {
      setInvites([]);
      setPendingInvitesCount(0);
      setLoadingInvites(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id, canManageCompany, inviteStatusFilter]);

  const sortedUsers = useMemo(() => {
    const arr = Array.isArray(users) ? [...users] : [];
    const rank = (r) => {
      const v = (r || "member").toLowerCase();
      if (v === "owner") return 0;
      if (v === "admin") return 1;
      return 2;
    };
    arr.sort((a, b) => {
      const ra = rank(a?.company_role);
      const rb = rank(b?.company_role);
      if (ra !== rb) return ra - rb;
      return String(a?.email || "").localeCompare(String(b?.email || ""));
    });
    return arr;
  }, [users]);

  const companyRoleOptions = useMemo(() => {
    return [
      { value: "member", label: t("pro_empresa.company.role.member") },
      { value: "admin", label: t("pro_empresa.company.role.admin") },
    ];
  }, [t]);

  const inviteFilterOptions = useMemo(() => {
    return ["pending", "accepted", "cancelled", "expired"];
  }, []);

  async function bootstrap() {
    try {
      const payload = { name: (bootstrapName || "").trim() || undefined };
      await apiFetch(companyRoutes.bootstrap, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(t("pro_empresa.company.toast.bootstrapped"));
      await loadCompany();
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.company.toast.bootstrap_error"));
    }
  }

  async function setRole(targetUserId, role) {
    try {
      await apiFetch(companyRoutes.updateUserRole(targetUserId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      toast.success(t("pro_empresa.company.toast.role_updated"));
      // atualiza localmente
      setUsers((prev) =>
        (Array.isArray(prev) ? prev : []).map((u) =>
          u?.id === targetUserId ? { ...u, company_role: role } : u
        )
      );
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.company.toast.role_update_error"));
    }
  }

  async function addUserToCompany() {
    const email = (addEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error(t("pro_empresa.company.toast.invalid_email"));
      return;
    }

    try {
      const data = await apiFetch(companyRoutes.addUser, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const action = (data?.action || "").toLowerCase();
      if (action === "invite_created") {
        toast.success(t("pro_empresa.company.toast.invite_created"));
        await loadInvites(inviteStatusFilter);
      } else if (action === "invite_exists") {
        toast.info(t("pro_empresa.company.toast.invite_exists"));
        await loadInvites(inviteStatusFilter);
      } else {
        toast.success(t("pro_empresa.company.toast.user_added"));
      }

      setAddEmail("");
      await loadUsers();
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.company.toast.user_add_error"));
    }
  }

  async function resendInvite(inviteId) {
    try {
      const data = await apiFetch(companyRoutes.resendInvite(inviteId), {
        method: "POST",
      });
      if (data?.email_sent === false) {
        toast.warning(t("pro_empresa.company.toast.invite_resend_partial"));
      } else {
        toast.success(t("pro_empresa.company.toast.invite_resent"));
      }
      await loadInvites(inviteStatusFilter);
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.company.toast.invite_resend_error"));
    }
  }

  async function cancelInvite(inviteId) {
    try {
      await apiFetch(companyRoutes.cancelInvite(inviteId), {
        method: "DELETE",
      });
      toast.success(t("pro_empresa.company.toast.invite_cancelled"));
      await loadInvites(inviteStatusFilter);
    } catch (e) {
      toast.error(e?.message || t("pro_empresa.company.toast.invite_cancel_error"));
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t("pro_empresa.company.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">{t("pro_empresa.company.subtitle")}</p>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            {loading ? (
              <div className="text-sm text-gray-500">{t("common.loading")}</div>
            ) : !company ? (
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {t("pro_empresa.company.no_company.title")}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {t("pro_empresa.company.no_company.subtitle")}
                </div>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    value={bootstrapName}
                    onChange={(e) => setBootstrapName(e.target.value)}
                    placeholder={t("pro_empresa.company.no_company.name_placeholder")}
                    className="w-full sm:w-96 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                  <button
                    onClick={bootstrap}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    {t("pro_empresa.company.no_company.cta")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900">{company?.name}</div>
                    {canManageCompany && pendingInvitesCount > 0 && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {pendingInvitesCount} {t("pro_empresa.company.badges.pending_invites")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("pro_empresa.company.my_role")}{" "}
                    <span className="font-medium text-gray-700">
                      {t(`pro_empresa.company.role.${(myCompanyRole || "member").toLowerCase()}`)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    loadCompany();
                    loadUsers();
                  }}
                  className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 self-start sm:self-auto"
                >
                  {t("pro_empresa.company.refresh")}
                </button>
              </div>
            )}
          </div>

          {company && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  {t("pro_empresa.company.users.title")}
                </div>
                <button
                  onClick={loadUsers}
                  className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                >
                  {t("pro_empresa.company.refresh")}
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                {t("pro_empresa.company.users.scope_hint")}{" "}
                <Link to="/pro-empresa/workspaces" className="text-blue-700 hover:underline">
                  {t("pro_empresa.company.users.scope_hint_link")}
                </Link>
                .
              </div>

              {!isOwner && (
                <div className="mt-2 text-xs text-gray-500">
                  {t("pro_empresa.company.users.readonly_hint")}
                </div>
              )}

              {canManageCompany && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700">
                    {t("pro_empresa.company.users.add.title")}
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <input
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder={t("pro_empresa.company.users.add.placeholder")}
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                    />
                    <button
                      onClick={addUserToCompany}
                      disabled={!addEmail.trim().includes("@")}
                      className="h-10 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {t("pro_empresa.company.users.add.cta")}
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {t("pro_empresa.company.users.add.hint")}
                  </div>
                </div>
              )}

              {canManageCompany && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <span>{t("pro_empresa.company.invites.title")}</span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        {pendingInvitesCount}
                      </span>
                    </div>
                    <button
                      onClick={() => loadInvites(inviteStatusFilter)}
                      className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      {t("pro_empresa.company.refresh")}
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {inviteFilterOptions.map((status) => {
                      const active = inviteStatusFilter === status;
                      return (
                        <button
                          key={status}
                          onClick={() => setInviteStatusFilter(status)}
                          className={`h-7 px-3 rounded-full text-xs border transition ${
                            active
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {t(`pro_empresa.company.invites.filters.${status}`)}
                        </button>
                      );
                    })}
                  </div>

                  {loadingInvites ? (
                    <div className="mt-2 text-xs text-gray-500">{t("common.loading")}</div>
                  ) : invites.length === 0 ? (
                    <div className="mt-2 text-xs text-gray-500">
                      {t("pro_empresa.company.invites.empty")}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {invites.map((invite) => (
                        <div
                          key={invite?.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invite?.invited_email}</div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-700">
                                  {t(`pro_empresa.company.invites.status.${invite?.status || "pending"}`)}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600">
                                  {t("pro_empresa.company.invites.resend_count")} {invite?.resend_count || 0}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                              {t("pro_empresa.company.invites.created_at")}{" "}
                              {invite?.created_at ? new Date(invite.created_at).toLocaleString() : "—"}
                            </div>
                              <div className="text-xs text-gray-500">
                                {t("pro_empresa.company.invites.expires_at")}{" "}
                                {invite?.expires_at ? new Date(invite.expires_at).toLocaleString() : "—"}
                              </div>
                          </div>
                          {invite?.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => resendInvite(invite?.id)}
                                className="h-8 px-3 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                              >
                                {t("pro_empresa.company.invites.resend")}
                              </button>
                              <button
                                onClick={() => cancelInvite(invite?.id)}
                                className="h-8 px-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100"
                              >
                                {t("pro_empresa.company.invites.cancel")}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {loadingUsers ? (
                <div className="mt-3 text-sm text-gray-500">{t("common.loading")}</div>
              ) : sortedUsers.length === 0 ? (
                <div className="mt-3 text-sm text-gray-500">{t("pro_empresa.company.users.empty")}</div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="py-2 pr-4">{t("pro_empresa.company.users.table.user")}</th>
                        <th className="py-2 pr-4">{t("pro_empresa.company.users.table.email")}</th>
                        <th className="py-2 pr-4">{t("pro_empresa.company.users.table.role_company")}</th>
                        <th className="py-2 pr-0">{t("pro_empresa.company.users.table.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map((u) => {
                        const role = (u?.company_role || "member").toLowerCase();
                        const isRowOwner = role === "owner";
                        const isMe = u?.id === user?.id;
                        return (
                          <tr key={u?.id} className="border-t border-gray-100">
                            <td className="py-2 pr-4">
                              <div className="font-medium text-gray-900">{u?.full_name || "—"}</div>
                              <div className="text-xs text-gray-500">@{u?.username || "—"}</div>
                            </td>
                            <td className="py-2 pr-4 text-gray-700">{u?.email || "—"}</td>
                            <td className="py-2 pr-4">
                              <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                                {t(`pro_empresa.company.role.${role}`)}
                              </span>
                            </td>
                            <td className="py-2 pr-0">
                              {isOwner && !isRowOwner && !isMe ? (
                                <div className="flex items-center gap-2">
                                  <div className="min-w-[140px]">
                                    <CustomSelect
                                      value={companyRoleOptions.find((o) => o.value === role) || companyRoleOptions[0]}
                                      onChange={(opt) => setRole(u.id, opt?.value)}
                                      options={companyRoleOptions}
                                      isSearchable={false}
                                      placeholder={t("pro_empresa.company.role.member")}
                                      styles={{
                                        control: (base) => ({
                                          ...base,
                                          minHeight: 32,
                                          height: 32,
                                          borderRadius: 10,
                                          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                                        }),
                                        valueContainer: (base) => ({
                                          ...base,
                                          height: 32,
                                          padding: "0 8px",
                                        }),
                                        indicatorsContainer: (base) => ({
                                          ...base,
                                          height: 32,
                                        }),
                                        option: (base, state) => ({
                                          ...base,
                                          padding: "8px 10px",
                                          fontSize: 12,
                                          backgroundColor: state.isFocused ? "rgba(59, 130, 246, 0.12)" : "#fff",
                                          color: "#111827",
                                        }),
                                        singleValue: (base) => ({ ...base, fontSize: 12 }),
                                        menu: (base) => ({ ...base, zIndex: 60 }),
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  {isRowOwner
                                    ? t("pro_empresa.company.users.action.owner_locked")
                                    : isMe
                                      ? t("pro_empresa.company.users.action.you")
                                      : "—"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}


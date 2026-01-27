import { useState, useEffect } from "react";
import Layout from "../../../components/layout/Layout";
import { Trash, Edit, Search, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { adminRoutes, userRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService";
import useSelectionMode from "../../workspace/hooks/useSelectionMode";
import SelectionToggleButton from "../../workspace/components/SelectionToggleButton";
import SelectionToolbar from "../../workspace/components/SelectionToolbar";
import UserDetailsModal from "../components/UserDetailsModal";
import { Link, useNavigate } from "react-router-dom";
import styles from "../admin.module.css";
import { useLanguage } from "../../../context/LanguageContext";

export default function AdminUsersList() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalUser, setModalUser] = useState(null);

  const { selectionMode, selectedItems, toggleSelectionMode, toggleSelect, clearSelection } = useSelectionMode();
  const selectedIds = selectedItems.map((u) => u?.id);

  useEffect(() => {
    fetchUsers().finally(() => setLoading(false));
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiFetch(adminRoutes.listUsers());
      const safeData = data.map((u, i) => ({
        id: u.id ?? `missing-id-${i}`,
        full_name: u.full_name ?? t("common.placeholder"),
        username: u.username ?? t("common.placeholder"),
        email: u.email ?? t("common.placeholder"),
        plan: u.plan ?? null,
        is_active: u.is_active ?? false,
        role: u.role ?? "user",
      }));
      setUsers(safeData);
    } catch {
      toast.error(t("admin.users.load_error"));
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm(t("admin.users.delete.confirm_single"))) return;
    try {
      await apiFetch(userRoutes.deleteUser(id), { method: "DELETE" });
      setUsers(users.filter((u) => u.id !== id));
      toast.success(t("admin.users.delete.success_single"));
      fetchUsers();
    } catch {
      toast.error(t("admin.users.delete.error_single"));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(t("admin.users.delete.confirm_multiple", { count: selectedItems.length }))) return;
    try {
      await Promise.all(selectedIds.map((id) => apiFetch(userRoutes.deleteUser(id), { method: "DELETE" })));
      setUsers(users.filter((u) => !selectedIds.includes(u.id)));
      clearSelection();
      toast.success(t("admin.users.delete.success_multiple"));
      fetchUsers();
    } catch {
      toast.error(t("admin.users.delete.error_multiple"));
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <Layout>
      {/* Cabeçalho, busca e botão de seleção */}
      <div className={styles.returnLink}>
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-700 hover:text-black">
          <ArrowLeft className="w-4 h-4 mr-2" />
        </button>
        <nav className="flex items-center text-sm space-x-1">
          <Link to="/admin" className="text-gray-700 hover:text-black">{t("admin.title")}</Link>
          <span>/</span>
          <span className="text-gray-500">{t("admin.users.title")}</span>
        </nav>
      </div>

      <h1 className="text-xl font-semibold mb-4">{t("admin.users.title")}</h1>
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="search"
            placeholder={t("admin.users.search.placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 py-2 rounded-lg border bg-white text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-3 items-center">
          <SelectionToggleButton selectionMode={selectionMode} onToggle={toggleSelectionMode} />
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">{t("admin.users.loading")}</p>
      ) : filteredUsers.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{t("admin.users.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredUsers.map((user) => {
            const isSelected = selectedItems.some((u) => u?.id === user?.id);
            const bgClass = user.is_active ? "bg-white border-blue-400" : "bg-gray-50 border-gray-300";
            return (
              <div
                key={user.id}
                className={`relative p-4 rounded-xl shadow-sm border flex justify-between items-start gap-4 cursor-pointer
                  ${bgClass}
                  ${selectionMode ? (isSelected ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-blue-300") : ""}`}
                onClick={() => selectionMode && toggleSelect(user)}
              >
                {selectionMode && (
                  <div className="absolute top-2 right-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(user);
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      title={t("admin.users.select.title")}
                    />
                  </div>
                )}

                <div className="flex flex-col w-full">
                  <p className="font-semibold text-black">{user.full_name ?? t("common.placeholder")} ({user.username ?? t("common.placeholder")})</p>
                  <p className="text-gray-600 text-sm">{user.email ?? t("common.placeholder")}</p>
                  <p className="text-gray-600 text-sm">{t("admin.users.fields.plan")}: {user.plan?.name ?? t("common.placeholder")}</p>
                  <p className="text-gray-600 text-sm">{t("admin.users.fields.status")}: {user.is_active ? t("admin.users.status.active") : t("admin.users.status.inactive")}</p>
                </div>

                {!selectionMode && (
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setModalUser(user); }} className="text-blue-600 hover:text-blue-800" title={t("admin.users.actions.edit") }>
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }} className="text-red-600 hover:text-red-800" title={t("admin.users.actions.delete") }>
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SelectionToolbar count={selectedItems.length} confirmLabel={t("admin.users.toolbar.delete_selected")} onConfirm={handleDeleteSelected} confirmColor="red" icon={<Trash className="w-4 h-4" />} />

      {modalUser && (
        <UserDetailsModal
          user={modalUser}
          onClose={() => setModalUser(null)}
          onUpdate={(updatedUser) => {
            setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
            fetchUsers();
            setModalUser(null);
          }}
        />
      )}
    </Layout>
  );
}
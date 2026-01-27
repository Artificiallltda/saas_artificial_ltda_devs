import { useState, useEffect } from "react";
import Layout from "../../components/layout/Layout";
import styles from "./notifications.module.css";
import { Search, Trash, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import FiltersPanel from "../workspace/components/FiltersPanel";
import SortMenu from "../workspace/components/SortMenu";
import { useNotifications } from "../../context/NotificationContext";
import { notificationRoutes } from "../../services/apiRoutes";
import { apiFetch } from "../../services/apiService";
import useSelectionMode from "../workspace/hooks/useSelectionMode";
import SelectionToggleButton from "../workspace/components/SelectionToggleButton";
import SelectionToolbar from "../workspace/components/SelectionToolbar";
import { useLanguage } from "../../context/LanguageContext";

export default function NotificationsList() {
  const { t, language } = useLanguage();
  const {
    notifications,
    setNotifications,
    fetchNotifications,
    unreadCount,
    setUnreadCount,
  } = useNotifications();

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [filterReadStatus, setFilterReadStatus] = useState(""); // "" | "read" | "unread"
  const [sortBy, setSortBy] = useState("recent");
  const [loading, setLoading] = useState(true);

  const {
    selectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleSelect,
    clearSelection,
  } = useSelectionMode();

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const selectedIds = selectedItems.map((item) => item.id);

  const handleDeleteNotification = async (id) => {
    if (!window.confirm(t("notifications.delete.confirm_single"))) return;
    try {
      await apiFetch(notificationRoutes.delete(id), { method: "DELETE" });
      const updated = notifications.filter((n) => n.id !== id);
      setNotifications(updated);
      setUnreadCount(updated.filter((n) => !n.is_read).length);
      toast.success(t("notifications.delete.success_single"));
    } catch (err) {
      toast.error(err.message || t("notifications.delete.error_single"));
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiFetch(notificationRoutes.markSingle(id), { method: "PATCH" });
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
      setNotifications(updated);
      setUnreadCount(updated.filter((n) => !n.is_read).length);
      toast.success(t("notifications.mark_read.success_single"));
    } catch (err) {
      toast.error(err.message || t("notifications.mark_read.error_single"));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(t("notifications.delete.confirm_multiple", { count: selectedItems.length }))) return;
    try {
      await Promise.all(
        selectedIds.map((id) => apiFetch(notificationRoutes.delete(id), { method: "DELETE" }))
      );
      const updated = notifications.filter((n) => !selectedIds.includes(n.id));
      setNotifications(updated);
      setUnreadCount(updated.filter((n) => !n.is_read).length);
      clearSelection();
      toast.success(t("notifications.delete.success_multiple"));
    } catch (err) {
      toast.error(err.message || t("notifications.delete.error_multiple"));
    }
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedItems.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => apiFetch(notificationRoutes.markSingle(id), { method: "PATCH" }))
      );
      const updated = notifications.map((n) =>
        selectedIds.includes(n.id) ? { ...n, is_read: true } : n
      );
      setNotifications(updated);
      setUnreadCount(updated.filter((n) => !n.is_read).length);
      clearSelection();
      toast.success(t("notifications.mark_read.success_multiple"));
    } catch (err) {
      toast.error(err.message || t("notifications.mark_read.error_multiple"));
    }
  };

  // Aplicando os filtros: busca, leitura e ordenação
  const filteredNotifications = notifications
    .filter((n) => n.message.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((n) => {
      if (filterReadStatus === "read") return n.is_read === true;
      if (filterReadStatus === "unread") return n.is_read === false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      return a.message.localeCompare(b.message);
    });

  return (
    <Layout>
      <h1 className={styles.title}>{t("notifications.title")}</h1>
      <p className="text-gray-600 mb-6">
        {t("notifications.subtitle")}{" "}
        <strong>
          {unreadCount} {t(unreadCount === 1 ? "notifications.unread.single" : "notifications.unread.plural")}
        </strong>
      </p>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="search"
            placeholder={t("notifications.search.placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 py-2 bg-white rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
            autoComplete="off"
          />
        </div>

        <div className="flex gap-3 items-center">
          <SelectionToggleButton selectionMode={selectionMode} onToggle={toggleSelectionMode} />
          <FiltersPanel
            activeTab="notifications"
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            filterReadStatus={filterReadStatus}
            setFilterReadStatus={setFilterReadStatus}
            // Passar vazios para as props que não serão usadas aqui para não quebrar outros usos
            filterModel=""
            setFilterModel={() => {}}
            filterStyle=""
            setFilterStyle={() => {}}
            filterRatio=""
            setFilterRatio={() => {}}
            filterTempMin=""
            setFilterTempMin={() => {}}
            filterTempMax=""
            setFilterTempMax={() => {}}
            filterDurMin=""
            setFilterDurMin={() => {}}
            filterDurMax=""
            setFilterDurMax={() => {}}
          />
          <SortMenu activeTab="notifications" sortBy={sortBy} setSortBy={setSortBy} />
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm">{t("notifications.loading")}</p>
      ) : filteredNotifications.length === 0 ? (
        <p className="mt-6 text-gray-500 text-sm">{t("notifications.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
  {filteredNotifications.map((notification) => {
    const isSelected = selectedItems.some((c) => c.id === notification.id);
    return (
      <div
        key={notification.id}
        className={`relative p-4 rounded-xl shadow-sm border transition-all duration-200 flex justify-between items-start gap-4
          ${
            notification.is_read
              ? "bg-gray-100 border-gray-300"
              : "bg-white border-blue-400"
          }
          ${selectionMode ? (isSelected ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-blue-300") : ""}
        `}
        onClick={() => {
          if (selectionMode) toggleSelect(notification);
        }}
      >
        {/* Ícone da lixeira flutuante no topo direito */}
        {!selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNotification(notification.id);
            }}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md z-10"
            aria-label={t("notifications.delete.aria")}
            title={t("notifications.delete.title")}
          >
            <Trash className="w-4 h-4" />
          </button>
        )}

        {/* Checkbox no modo de seleção */}
        {selectionMode && (
          <div className="absolute top-2 right-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelect(notification);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              title={t("notifications.select.title")}
            />
          </div>
        )}

        {/* Conteúdo da notificação */}
        <div className="flex flex-col w-full">
          <p
            className={`text-sm break-words ${
              notification.is_read ? "text-gray-600" : "font-semibold text-black"
            }`}
          >
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {notification.created_at instanceof Date
            ? notification.created_at.toLocaleString(language)
            : ""}
          </p>

          <div className="relative min-h-[1px]">
            {!selectionMode && !notification.is_read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(notification.id);
                }}
                className="absolute right-3 top-[-1rem] inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
              >
                <CheckCircle className="w-4 h-4 relative top-[1px]" />
                {t("notifications.mark_read.cta")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  })}
</div>

      )}

      <SelectionToolbar
        count={selectedItems.length}
        confirmLabel={t("notifications.toolbar.delete_selected")}
        onConfirm={handleDeleteSelected}
        confirmColor="red"
        icon={<Trash className="w-4 h-4" />}
        secondaryConfirmLabel={t("notifications.toolbar.mark_read")}
        onSecondaryConfirm={handleMarkSelectedAsRead}
        secondaryConfirmColor="blue"
        secondaryIcon={<CheckCircle className="w-4 h-4" />}
      />
    </Layout>
  );
}
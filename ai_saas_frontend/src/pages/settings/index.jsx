import { useState, useEffect } from "react";
import { UserCircle2, UserCog, Trash2, FileText } from "lucide-react";
import Layout from "../../components/layout/Layout";
import styles from "./settings.module.css";
import SettingsModal from "../../components/modals/SettingsModal";
import SecurityModal from "../../components/modals/SecurityModal";
import { useProjects } from "../../hooks/useProjects";
import { useContents } from "../../hooks/useContents";
import { userRoutes, emailRoutes } from "../../services/apiRoutes";
import { apiFetch } from "../../services/apiService";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

export default function Settings() {
  const { t, language } = useLanguage();
  const [user, setUser] = useState(null);
  const { projects } = useProjects(user);
  const { contents } = useContents(user);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDeleteVerifyModal, setShowDeleteVerifyModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiFetch(userRoutes.getCurrentUser());
        setUser(data);
      } catch {
        toast.error(t("settings.load_user_error"));
      }
    };
    loadUser();
  }, []);

  const requestSecurityCode = async () => {
    setErrorMessage("");
    try {
      await apiFetch(emailRoutes.sendSecurityCode, { method: "POST" });
      toast.success(t("settings.security_code.sent"));
    } catch {
      setErrorMessage(t("settings.security_code.send_error"));
    }
  };

  const verifySecurityCode = async (code) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/email/verify-security-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error(t("settings.security_code.invalid"));
      setShowDeleteVerifyModal(false);
      setShowDeleteConfirmModal(true);
      toast.success(t("settings.security_code.verified"));
    } catch {
      setErrorMessage(t("settings.security_code.wrong_or_expired"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await apiFetch(userRoutes.deleteUser(user?.id), { method: "DELETE" });
      toast.success(t("settings.delete_account.success"));
      window.location.href = "/";
    } catch {
      toast.error(t("settings.delete_account.error"));
    } finally {
      setLoading(false);
      setShowDeleteConfirmModal(false);
    }
  };

  return (
    <Layout>
      <section className="space-y-8">
        <h1 className={styles.title}>{t("settings.title")}</h1>
        <div className={styles.panelGrid}>
          <div
            className={`${styles.modernCard} ${styles.modernCardPlan}`}
            onClick={() => setShowPlanModal(true)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && setShowPlanModal(true)}
          >
            <UserCog size={28} className={styles.iconPlan} />
            <h2 className={styles.cardTitle}>{t("settings.cards.plan.title")}</h2>
            <p className={styles.cardDescription}>{t("settings.cards.plan.description")}</p>
          </div>

          <div
            className={`${styles.modernCard} ${styles.modernCardAccount}`}
            onClick={() => setShowAccountModal(true)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && setShowAccountModal(true)}
          >
            <UserCircle2 size={28} className={styles.iconAccount} />
            <h2 className={styles.cardTitle}>{t("settings.cards.account.title")}</h2>
            <p className={styles.cardDescription}>{t("settings.cards.account.description")}</p>
          </div>

          <div
            className={styles.modernCardDanger}
            onClick={() => {
              setShowDeleteVerifyModal(true);
              requestSecurityCode();
            }}
            role="button"
            tabIndex={0}
            onKeyPress={(e) =>
              e.key === "Enter" && (setShowDeleteVerifyModal(true), requestSecurityCode())
            }
          >
            <Trash2 size={28} className={styles.iconDanger} />
            <h2 className={styles.cardTitle}>{t("settings.cards.delete_account.title")}</h2>
            <p className={styles.cardDescription}>{t("settings.cards.delete_account.description")}</p>
          </div>
        </div>

        {/* Modais */}
        <SettingsModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          title={t("settings.plan_modal.title")}
          description={t("settings.plan_modal.description")}
        >
          {user ? (
            <>
              <p className="text-gray-700 text-sm">
                <strong className="font-semibold text-gray-900 text-sm">{t("settings.plan_modal.current_plan")}</strong> {user.plan?.name || t("common.not_informed")}
              </p>
              <div className="flex mt-8">
                <Link
                  to="/subscription"
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-black text-white hover:opacity-90 transition ml-auto"
                >
                  {t("settings.plan_modal.plan_details")} <FileText className="w-4 h-4" />
                </Link>
              </div>
            </>
          ) : (
            <p>{t("common.loading")}</p>
          )}
        </SettingsModal>

        <SettingsModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          title={t("settings.account_modal.title")}
          description={t("settings.account_modal.description")}
        >
          {user ? (
            <>
              <p className="text-gray-700 text-sm">
                <strong className="font-semibold text-gray-900 text-sm">{t("settings.account_modal.name")}</strong> {user.full_name || t("common.na")}
              </p>
              <p className="text-gray-700 text-sm">
                <strong className="font-semibold text-gray-900 text-sm">{t("settings.account_modal.email")}</strong> {user.email || t("common.na")}
              </p>
              <p className="text-gray-700 text-sm">
                <strong className="font-semibold text-gray-900 text-sm">{t("settings.account_modal.generated_contents")}</strong> {contents.length}
              </p>
              <p className="text-gray-700 text-sm">
                <strong className="font-semibold text-gray-900 text-sm">{t("settings.account_modal.generated_projects")}</strong> {projects.length}
              </p>
              <p className="text-gray-700 text-sm">
                <strong className="font-semibold text-gray-900 text-sm">{t("settings.account_modal.created_at")}</strong>{" "}
                {new Date(user.created_at).toLocaleDateString(language)}
              </p>
            </>
          ) : (
            <p>{t("common.loading")}</p>
          )}
        </SettingsModal>

        <SecurityModal
          isOpen={showDeleteVerifyModal}
          onClose={() => setShowDeleteVerifyModal(false)}
          onVerify={verifySecurityCode}
          onRequestCode={requestSecurityCode}
          loading={loading}
          errorMessage={errorMessage}
        />

        <SettingsModal
          isOpen={showDeleteConfirmModal}
          onClose={() => setShowDeleteConfirmModal(false)}
          title={t("settings.delete_confirm.title")}
          description={t("settings.delete_confirm.description")}
        >
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              className="py-2 px-4 rounded border border-gray-300 hover:bg-gray-100"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={loading}
              className="py-2 px-4 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? t("settings.delete_account.deleting") : t("settings.delete_account.cta")}
            </button>
          </div>
        </SettingsModal>
      </section>
    </Layout>
  );
}
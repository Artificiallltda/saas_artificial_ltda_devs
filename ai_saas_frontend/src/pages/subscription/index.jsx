import { useState, useEffect } from "react";
import Layout from "../../components/layout/Layout";
import SettingsModal from "../../components/modals/SettingsModal";
import { UserCheck, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import styles from "./subscription.module.css";
import { apiFetch } from "../../services/apiService";
import { userRoutes } from "../../services/apiRoutes";
import { useLanguage } from "../../context/LanguageContext";
import { backendMessageKeyMap } from "../../i18n";

export default function Subscription() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const translateBackendText = (text) => {
    if (!text) return text;
    const key = backendMessageKeyMap[text];
    if (key) return t(key);
    return text;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiFetch(userRoutes.getCurrentUser());
        setUser(data);
      } catch {
        toast.error(t("subscription.load_user_error"));
      }
    };
    loadUser();
  }, []);

  const renderFeatures = (features) => {
    return (
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {features.map((pf) => {
          const isEnabled = pf.value === "true";
          const displayValue =
            pf.value !== "true" && pf.value !== "false" ? pf.value : null;

          return (
            <li
              key={pf.id}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-shadow shadow-sm hover:shadow-md text-sm"
            >
              {isEnabled ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex flex-col">
                <span
                  className="font-medium text-gray-900 dark:text-gray-100 line-clamp-3"
                  style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  {translateBackendText(pf.description)}
                </span>
                {displayValue && (
                  <span className="text-gray-600 dark:text-gray-300 text-xs">
                    {translateBackendText(displayValue)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Layout>
      <section className={styles.container}>
        <h1 className={styles.title}>{t("subscription.title")}</h1>

        <div className={styles.grid}>
          {/* Plano Atual */}
          <div
            className={styles.card}
            role="button"
            tabIndex={0}
            onClick={() => setShowInfoModal(true)}
            onKeyDown={(e) => e.key === "Enter" && setShowInfoModal(true)}
          >
            <div className={styles.iconWrapper}>
              <UserCheck size={40} color="#16a34a" />
            </div>
            <h2 className={styles.cardTitle}>{t("subscription.current_plan.title")}</h2>
            {user ? (
              <>
                <p className={styles.planName}>
                  {user.plan?.name ? translateBackendText(user.plan.name) : t("common.not_informed")}
                </p>
                {Array.isArray(user.plan?.features) &&
                  user.plan.features.length > 0 &&
                  renderFeatures(user.plan.features)}
              </>
            ) : (
              <p>{t("common.loading")}</p>
            )}
          </div>

          {/* Upgrade */}
          <div
            className={`${styles.card} ${styles.upgradeCard}`}
            role="button"
            tabIndex={0}
            onClick={() => setShowUpgradeModal(true)}
            onKeyDown={(e) => e.key === "Enter" && setShowUpgradeModal(true)}
          >
            <div className={styles.iconWrapper}>
              <TrendingUp size={40} color="#facc15" />
            </div>
            <h2 className={styles.cardTitle}>{t("subscription.upgrade.title")}</h2>
            <p className={styles.description}>
              {t("subscription.upgrade.description")}
            </p>
            <button
              disabled
              className={styles.upgradeBtn}
              title={t("common.not_implemented")}
            >
              {t("subscription.upgrade.contact_us")}
            </button>
          </div>
        </div>
      </section>

      {/* Modal info */}
      <SettingsModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title={t("subscription.info_modal.title")}
        description={t("subscription.info_modal.description")}
      >
        {user ? (
          <>
            <p className="text-gray-700 text-sm">
              <strong className="font-semibold text-gray-900 text-sm">
                {t("subscription.info_modal.plan_label")}
              </strong>{" "}
              {user.plan?.name ? translateBackendText(user.plan.name) : t("common.not_informed")}
            </p>
            {Array.isArray(user.plan?.features) &&
              user.plan.features.length > 0 &&
              renderFeatures(user.plan.features)}
          </>
        ) : (
          <p>{t("common.loading")}</p>
        )}
      </SettingsModal>

      {/* Modal upgrade */}
      <SettingsModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={t("subscription.premium_modal.title")}
        description={t("subscription.premium_modal.description")}
      >
        <p className={styles.upgradeText}>
          {t("subscription.premium_modal.body")}
        </p>
        <button
          disabled
          className={styles.upgradeBtn}
          title={t("common.not_implemented")}
        >
          {t("subscription.premium_modal.cta")}
        </button>
      </SettingsModal>
    </Layout>
  );
}
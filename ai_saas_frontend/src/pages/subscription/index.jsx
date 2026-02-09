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
  const isProPlan = user?.plan?.name?.toLowerCase().includes("pro");
  const upgradeModalKeyPrefix = isProPlan
    ? "subscription.best_plan_modal"
    : user?.plan?.name?.toLowerCase().includes("premium")
      ? "subscription.pro_modal"
      : "subscription.premium_modal";

  const translateBackendText = (text) => {
    if (!text) return text;
    const key = backendMessageKeyMap[text];
    if (key) return t(key);
    return text;
  };

  const formatFeatureValue = (value) => {
    if (value == null) return value;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue.toLocaleString(t("dates.locale"));
    }
    return translateBackendText(value);
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
    const filteredFeatures = features.filter((pf) => {
      const featureKey = backendMessageKeyMap[pf.description];
      return (
        featureKey !== "subscription.features.gemini_2_5_flash" &&
        featureKey !== "subscription.features.gemini_2_5_pro" &&
        pf.description !== "Acesso ao Gemini 2.5 Flash" &&
        pf.description !== "Acesso ao Gemini 2.5 Pro"
      );
    });
    return (
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredFeatures.map((pf, index) => {
          const isEnabled =
            pf.value === "true" || (pf.value !== "false" && pf.value != null);
          const displayValue =
            pf.value !== "true" && pf.value !== "false" ? pf.value : null;

          return (
            <li
              key={pf.id || `feature-${index}`}
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
                    {formatFeatureValue(displayValue)}
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
              className={styles.upgradeBtn}
              onClick={(e) => {
                e.stopPropagation();
                const isPremiumPlan = user?.plan?.name?.toLowerCase().includes("premium");
                window.location.href = isPremiumPlan
                  ? "https://clkdmg.site/subscribe/plataforma-pro"
                  : "https://clkdmg.site/subscribe/plataforma-premium";
              }}
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
        title={t(`${upgradeModalKeyPrefix}.title`)}
        description={t(`${upgradeModalKeyPrefix}.description`)}
      >
        <p className={styles.upgradeText}>
          {t(`${upgradeModalKeyPrefix}.body`)}
        </p>
        {!isProPlan && (
          <button
            className={styles.upgradeBtn}
            onClick={() => {
              const isPremiumPlan = user?.plan?.name?.toLowerCase().includes("premium");
              window.location.href = isPremiumPlan
                ? "https://clkdmg.site/subscribe/plataforma-pro"
                : "https://clkdmg.site/subscribe/plataforma-premium";
            }}
          >
            {t(`${upgradeModalKeyPrefix}.cta`)}
          </button>
        )}
      </SettingsModal>
    </Layout>
  );
}
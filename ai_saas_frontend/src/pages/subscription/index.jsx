import { useState, useEffect } from "react";
import Layout from "../../components/layout/Layout";
import SettingsModal from "../../components/modals/SettingsModal";
import { UserCheck, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import styles from "./subscription.module.css";
import { apiFetch } from "../../services/apiService";
import { userRoutes } from "../../services/apiRoutes";

export default function Subscription() {
  const [user, setUser] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiFetch(userRoutes.getCurrentUser());
        setUser(data);
      } catch {
        toast.error("Erro ao carregar dados do usuário");
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
                  {pf.description}
                </span>
                {displayValue && (
                  <span className="text-gray-600 dark:text-gray-300 text-xs">
                    {displayValue}
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
        <h1 className={styles.title}>Assinatura</h1>

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
            <h2 className={styles.cardTitle}>Seu Plano Atual</h2>
            {user ? (
              <>
                <p className={styles.planName}>{user.plan?.name || "Não informado"}</p>
                {Array.isArray(user.plan?.features) &&
                  user.plan.features.length > 0 &&
                  renderFeatures(user.plan.features)}
              </>
            ) : (
              <p>Carregando...</p>
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
            <h2 className={styles.cardTitle}>Melhorar Plano</h2>
            <p className={styles.description}>
              Melhore seu plano na ARTIFICIALL para obter mais funcionalidades!
            </p>
            <button
              disabled
              className={styles.upgradeBtn}
              title="Funcionalidade ainda não implementada"
            >
              Contate-nos
            </button>
          </div>
        </div>
      </section>

      {/* Modal info */}
      <SettingsModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Informações do Plano"
        description="Detalhes do seu plano atual"
      >
        {user ? (
          <>
            <p className="text-gray-700 text-sm">
              <strong className="font-semibold text-gray-900 text-sm">
                Plano:
              </strong>{" "}
              {user.plan?.name || "Não informado"}
            </p>
            {Array.isArray(user.plan?.features) &&
              user.plan.features.length > 0 &&
              renderFeatures(user.plan.features)}
          </>
        ) : (
          <p>Carregando...</p>
        )}
      </SettingsModal>

      {/* Modal upgrade */}
      <SettingsModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Plano Premium"
        description="O plano Premium oferece recursos adicionais e suporte prioritário."
      >
        <p className={styles.upgradeText}>
          Com o plano Premium você terá acesso a funcionalidades exclusivas e suporte dedicado.
        </p>
        <button
          disabled
          className={styles.upgradeBtn}
          title="Funcionalidade ainda não implementada"
        >
          Adquirir Plano
        </button>
      </SettingsModal>
    </Layout>
  );
}

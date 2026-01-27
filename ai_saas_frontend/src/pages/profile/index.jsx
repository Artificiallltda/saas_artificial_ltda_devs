import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, FileText, HelpCircle, CreditCard } from "lucide-react";
import styles from "./profile.module.css";
import Layout from "../../components/layout/Layout";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { emailRoutes } from "../../services/apiRoutes";
import { apiFetch } from "../../services/apiService";
import SecurityModal from "../../components/modals/SecurityModal";
import { useLanguage } from "../../context/LanguageContext";

export default function Profile() {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { securityVerified, setSecurityVerified } = useAuth();

  const requestCode = async () => {
    setErrorMessage("");
    try {
      await apiFetch(emailRoutes.sendSecurityCode, { method: "POST" });
      toast.success(t("settings.security_code.sent"));
    } catch {
      setErrorMessage(t("settings.security_code.send_error"));
    }
  };

  const handleSecurityClick = async () => {
    if (securityVerified) {
      navigate("/profile/security");
      return;
    }
    setErrorMessage("");
    setShowModal(true);
    await requestCode();
  };

  const verifyCode = async (code) => {
    setLoading(true);
    setErrorMessage("");
    try {
      await apiFetch(emailRoutes.verifySecurityCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      toast.success(t("settings.security_code.verified"));
      setShowModal(false);
      setSecurityVerified(true);
      navigate("/profile/security");
    } catch {
      setErrorMessage(t("settings.security_code.wrong_or_expired"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="space-y-6">
        <h1 className={styles.title}>{t("profile.title")}</h1>
        <div className={styles.panelGrid}>
          <div
            className={`${styles.modernCard} ${styles.modernCardSecurity}`}
            onClick={handleSecurityClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && handleSecurityClick()}
          >
            <ShieldCheck size={28} className={styles.iconSecurity} />
            <h2 className={styles.cardTitle}>{t("profile.cards.security.title")}</h2>
            <p className={styles.cardDescription}>{t("profile.cards.security.description")}</p>
          </div>

          <Link
            to="/subscription"
            className={`${styles.modernCard} ${styles.modernCardSubscription}`}
          >
            <CreditCard size={28} className={styles.iconSubscription} />
            <h2 className={styles.cardTitle}>{t("profile.cards.subscription.title")}</h2>
            <p className={styles.cardDescription}>{t("profile.cards.subscription.description")}</p>
          </Link>

          <Link
            to="/workspace/projects"
            className={`${styles.modernCard} ${styles.modernCardProjects}`}
          >
            <FileText size={28} className={styles.iconProjects} />
            <h2 className={styles.cardTitle}>{t("profile.cards.projects.title")}</h2>
            <p className={styles.cardDescription}>{t("profile.cards.projects.description")}</p>
          </Link>

          <Link
            to="/profile/support"
            className={`${styles.modernCard} ${styles.modernCardSupport}`}
          >
            <HelpCircle size={28} className={styles.iconSupport} />
            <h2 className={styles.cardTitle}>{t("profile.cards.support.title")}</h2>
            <p className={styles.cardDescription}>{t("profile.cards.support.description")}</p>
          </Link>
        </div>
      </section>

      <SecurityModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onVerify={verifyCode}
        onRequestCode={requestCode}
        loading={loading}
        errorMessage={errorMessage}
      />
    </Layout>
  );
}

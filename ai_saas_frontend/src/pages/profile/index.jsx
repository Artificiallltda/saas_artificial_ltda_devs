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

export default function Profile() {
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { securityVerified, setSecurityVerified } = useAuth();

  const requestCode = async () => {
    setErrorMessage("");
    try {
      await apiFetch(emailRoutes.sendSecurityCode, { method: "POST" });
      toast.success("Código enviado para seu e-mail.");
    } catch {
      setErrorMessage("Erro ao enviar o código. Tente novamente.");
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
      toast.success("Código verificado com sucesso!");
      setShowModal(false);
      setSecurityVerified(true);
      navigate("/profile/security");
    } catch {
      setErrorMessage("Código incorreto ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="space-y-6">
        <h1 className={styles.title}>Minha Conta</h1>
        <div className={styles.panelGrid}>
          <div
            className={`${styles.modernCard} ${styles.modernCardSecurity}`}
            onClick={handleSecurityClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && handleSecurityClick()}
          >
            <ShieldCheck size={28} className={styles.iconSecurity} />
            <h2 className={styles.cardTitle}>Segurança</h2>
            <p className={styles.cardDescription}>Gerencie email e senha</p>
          </div>

          <Link
            to="/subscription"
            className={`${styles.modernCard} ${styles.modernCardSubscription}`}
          >
            <CreditCard size={28} className={styles.iconSubscription} />
            <h2 className={styles.cardTitle}>Assinatura</h2>
            <p className={styles.cardDescription}>Plano atual</p>
          </Link>

          <Link
            to="/workspace/projects"
            className={`${styles.modernCard} ${styles.modernCardProjects}`}
          >
            <FileText size={28} className={styles.iconProjects} />
            <h2 className={styles.cardTitle}>Projetos</h2>
            <p className={styles.cardDescription}>Acesse seus projetos</p>
          </Link>

          <Link
            to="/profile/support"
            className={`${styles.modernCard} ${styles.modernCardSupport}`}
          >
            <HelpCircle size={28} className={styles.iconSupport} />
            <h2 className={styles.cardTitle}>Suporte</h2>
            <p className={styles.cardDescription}>Central de ajuda</p>
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

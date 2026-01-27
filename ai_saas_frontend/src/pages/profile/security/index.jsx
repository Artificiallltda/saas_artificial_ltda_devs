import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, ImageIcon, UserCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "../profile.module.css";
import Layout from "../../../components/layout/Layout";

export default function Security() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className={styles.returnLink}>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-700 hover:text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
          </button>
          <nav className="flex items-center text-sm space-x-1">
            <Link to="/profile" className="text-gray-700 hover:text-black">
              Perfil
            </Link>
            <span>/</span>
            <span className="text-gray-500">Segurança</span>
          </nav>
        </div>
      <section className="space-y-6">
      <h1 className={styles.title}>Segurança</h1>
      <div className={styles.panelGrid}>
        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/name")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/name")}
        >
          <UserCircle2 size={28} className={styles.iconSecurity} />
          <h2 className={styles.cardTitle}>Nome completo</h2>
          <p className={styles.cardDescription}>Editar nome de exibição</p>
        </div>

        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/username")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/username")}
        >
          <User size={28} className={styles.iconSubscription} />
          <h2 className={styles.cardTitle}>Usuário</h2>
          <p className={styles.cardDescription}>Editar nome de usuário</p>
        </div>

        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/email")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/email")}
        >
          <Mail size={28} className={styles.iconProjects} />
          <h2 className={styles.cardTitle}>Email</h2>
          <p className={styles.cardDescription}>Alterar endereço de email</p>
        </div>

        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/password")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/password")}
        >
          <Lock size={28} className={styles.iconSupport} />
          <h2 className={styles.cardTitle}>Senha</h2>
          <p className={styles.cardDescription}>Atualizar senha de acesso</p>
        </div>

        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/photo")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/photo")}
        >
          <ImageIcon size={28} className={styles.iconSecurity} />
          <h2 className={styles.cardTitle}>Foto de Perfil</h2>
          <p className={styles.cardDescription}>Atualizar imagem do perfil</p>
        </div>
      </div>
    </section>
    </Layout>
  );
}
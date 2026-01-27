import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, ImageIcon, UserCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "../profile.module.css";
import Layout from "../../../components/layout/Layout";
import { useLanguage } from "../../../context/LanguageContext";

export default function Security() {
  const navigate = useNavigate();
  const { t } = useLanguage();

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
              {t("breadcrumbs.profile")}
            </Link>
            <span>/</span>
            <span className="text-gray-500">{t("breadcrumbs.security")}</span>
          </nav>
        </div>
      <section className="space-y-6">
      <h1 className={styles.title}>{t("profile.security.title")}</h1>
      <div className={styles.panelGrid}>
        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/name")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/name")}
        >
          <UserCircle2 size={28} className={styles.iconSecurity} />
          <h2 className={styles.cardTitle}>{t("profile.security.cards.full_name.title")}</h2>
          <p className={styles.cardDescription}>{t("profile.security.cards.full_name.description")}</p>
        </div>

        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/username")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/username")}
        >
          <User size={28} className={styles.iconSubscription} />
          <h2 className={styles.cardTitle}>{t("profile.security.cards.username.title")}</h2>
          <p className={styles.cardDescription}>{t("profile.security.cards.username.description")}</p>
        </div>

        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/email")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/email")}
        >
          <Mail size={28} className={styles.iconProjects} />
          <h2 className={styles.cardTitle}>{t("profile.security.cards.email.title")}</h2>
          <p className={styles.cardDescription}>{t("profile.security.cards.email.description")}</p>
        </div>

        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/password")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/password")}
        >
          <Lock size={28} className={styles.iconSupport} />
          <h2 className={styles.cardTitle}>{t("profile.security.cards.password.title")}</h2>
          <p className={styles.cardDescription}>{t("profile.security.cards.password.description")}</p>
        </div>

        <div
          className={styles.modernCard}
          onClick={() => navigate("/profile/security/photo")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && navigate("/profile/security/photo")}
        >
          <ImageIcon size={28} className={styles.iconSecurity} />
          <h2 className={styles.cardTitle}>{t("profile.security.cards.photo.title")}</h2>
          <p className={styles.cardDescription}>{t("profile.security.cards.photo.description")}</p>
        </div>
      </div>
    </section>
    </Layout>
  );
}
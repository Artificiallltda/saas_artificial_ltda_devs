import { useNavigate } from "react-router-dom";
import { Users, UserPlus, ArrowLeft, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./admin.module.css";
import Layout from "../../components/layout/Layout";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <Layout>

      <section className="space-y-6">
        <h1 className={styles.title}>{t("admin.title")}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`${styles.modernCard} ${styles.modernCardBlue}`}
            onClick={() => navigate("/admin/users")}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && navigate("/admin/users")}
          >
            <Users size={32} className="text-indigo-600" />
            <h2 className="text-lg font-semibold mt-2">{t("admin.cards.users.title")}</h2>
            <p className="text-sm text-gray-500">
              {t("admin.cards.users.description")}
            </p>
          </div>

          <div
            className={`${styles.modernCard} ${styles.modernCardGreen}`}
            onClick={() => navigate("/admin/users/create")}
            role="button"
            tabIndex={0}
            onKeyPress={(e) =>
              e.key === "Enter" && navigate("/admin/users/create")
            }
          >
            <UserPlus size={32} className="text-green-600" />
            <h2 className="text-lg font-semibold mt-2">{t("admin.cards.create_user.title")}</h2>
            <p className="text-sm text-gray-500">{t("admin.cards.create_user.description")}</p>
          </div>

          <div
            className={`${styles.modernCard}`}
            onClick={() => navigate("/admin/usage")}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && navigate("/admin/usage")}
          >
            <BarChart3 size={32} className="text-blue-600" />
            <h2 className="text-lg font-semibold mt-2">{t("admin.cards.usage.title")}</h2>
            <p className="text-sm text-gray-500">
              {t("admin.cards.usage.description")}
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}

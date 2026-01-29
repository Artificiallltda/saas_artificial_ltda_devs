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

      <section className="px-4 sm:px-6 space-y-6 py-8 min-h-[calc(100vh-64px-64px)]">
        <h1 className={styles.title}>{t("admin.title")}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
          <div
            className={`${styles.modernCard} ${styles.modernCardBlue}`}
            onClick={() => navigate("/admin/users")}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && navigate("/admin/users")}
          >
            <Users size={32} className="text-indigo-600" />
            <h2 className="text-lg font-semibold mt-2">{t("admin.users.card.title")}</h2>
            <p className="text-sm text-gray-500">
              {t("admin.users.card.description")}
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
            <h2 className="text-lg font-semibold mt-2">{t("admin.create_user.card.title")}</h2>
            <p className="text-sm text-gray-500">{t("admin.create_user.card.description")}</p>
          </div>

          <div
            className={`${styles.modernCard}`}
            onClick={() => navigate("/admin/usage")}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && navigate("/admin/usage")}
          >
            <BarChart3 size={32} className="text-blue-600" />
            <h2 className="text-lg font-semibold mt-2">{t("admin.usage.card.title")}</h2>
            <p className="text-sm text-gray-500">
              {t("admin.usage.card.description")}
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./forgot.module.css";
import { Lock } from "lucide-react";
import { authRoutes } from "../../../services/apiRoutes";
import { useLanguage } from "../../../context/LanguageContext";
import { backendMessageKeyMap } from "../../../i18n";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(authRoutes.resetPassword(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        const msg = data.message;
        const key = backendMessageKeyMap[msg];
        toast.success(key ? t(key) : msg);
        navigate("/login");
      } else {
        const backendMsg = data.error || t("auth.reset_password.error");
        const key = backendMessageKeyMap[backendMsg];
        toast.error(key ? t(key) : backendMsg);
      }
    } catch (error) {
      toast.error(t("auth.common.connection_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.pageBackground}>
      <section className={styles.statCard}>
        <h1 className={styles.title}>{t("auth.reset_password.title")}</h1>
        <form onSubmit={handleSubmit}>
          <div className="max-w-md w-full my-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                placeholder={t("auth.reset_password.password.placeholder")}
                className="w-xs pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnWide}`}
            disabled={loading}
          >
            {loading ? t("auth.reset_password.loading") : t("auth.reset_password.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./codeVerification.module.css";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { KeyRound, ArrowLeft } from "lucide-react";
import { emailRoutes } from "../../../services/apiRoutes";
import { useLanguage } from "../../../context/LanguageContext";
import { backendMessageKeyMap } from "../../../i18n";

function VerifyCode() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const email = state?.email;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!email) {
    navigate("/verify-email");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error(t("auth.verify_code.invalid_code_length"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(emailRoutes.verifyEmailCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        const backendMsg = data.error || t("auth.verify_code.error");
        const key = backendMessageKeyMap[backendMsg];
        throw new Error(key ? t(key) : backendMsg);
      }

      toast.success(t("auth.verify_code.success"));
      navigate("/register", { state: { email } });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.pageBackground}>
      <section className={styles.statCard}>
        <Link to="/login" className={styles.loginLink}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t("auth.common.back_to_login")}
        </Link>
        <h1 className={styles.title}>{t("auth.verify_code.title")}</h1>
        <form onSubmit={handleSubmit}>
          <div className="w-full">
            <p className="text-sm text-gray-700 py-3 text-center">
                {t("auth.verify_code.sent_to")} <strong>{email}</strong>
            </p>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="code"
                placeholder={t("auth.verify_code.code.placeholder")}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                maxLength="6"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnWide}`}
            disabled={loading}
          >
            {loading ? t("auth.verify_code.loading") : t("auth.verify_code.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}

export default VerifyCode;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./emailVerification.module.css";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { emailRoutes } from "../../../services/apiRoutes";
import { useLanguage } from "../../../context/LanguageContext";
import { backendMessageKeyMap } from "../../../i18n";

function EmailVerification() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    if (email && !emailRegex.test(email)) {
      setEmailError(t("auth.verify_email.invalid_email"));
    } else {
      setEmailError("");
    }
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(emailRoutes.requestEmailCode, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        const backendMsg = data?.error || t("auth.verify_email.send_error");
        const key = backendMessageKeyMap[backendMsg];
        throw new Error(key ? t(key) : backendMsg);
      }

      toast.success(t("auth.verify_email.sent"));
      navigate("/verify-code", { state: { email } });
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
        <h1 className={styles.title}>{t("auth.verify_email.title")}</h1>
        <form onSubmit={handleSubmit}>
          <div className="w-full my-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                name="email"
                placeholder={t("auth.verify_email.email.placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 py-2 rounded-lg border text-black text-sm shadow-sm focus:outline-none focus:shadow-md ${
                  emailError ? "border-red-400" : "border-gray-300"
                }`}
                required
              />
            </div>
            {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnWide}`}
            disabled={!email || emailError || loading}
          >
            {loading ? t("auth.verify_email.loading") : t("auth.verify_email.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}

export default EmailVerification;

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import styles from "./login.module.css";
import { User, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import { authRoutes } from "../../../services/apiRoutes";
import { useLanguage } from "../../../context/LanguageContext";
import { backendMessageKeyMap } from "../../../i18n";

function Login() {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(authRoutes.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });
      if (res.status === 429) {
        throw new Error(t("auth.login.rate_limit"));
      }
      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        const backendMsg = data?.error || t("auth.login.error");
        const key = backendMessageKeyMap[backendMsg];
        throw new Error(key ? t(key) : backendMsg);
      }

      loginSuccess(data);
      toast.success(t("auth.login.success"));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.pageBackground}>
      <section className={styles.loginCard}>
        <div className={styles.loginLeft}>
          <img src="/static/artificiall/Artificiall_Negativo_Vert_RGB.png" alt="Logo" className="w-64 h-auto" />
        </div>
        <div className={styles.loginRight}>
          <h1 className={styles.title}>{t("auth.login.title")}</h1>
          <form onSubmit={handleLogin} className="w-full max-w-sm">
            <div className="relative w-full my-4">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <User className="text-gray-400 w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder={t("auth.login.identifier.placeholder")}
                className="w-full pl-10 pr-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="relative w-full my-4">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <LockKeyhole className="text-gray-400 w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.login.password.placeholder")}
                className="w-full pl-10 pr-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? t("auth.login.password.hide") : t("auth.login.password.show")}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnWide}`}
              disabled={loading}
            >
              {loading ? t("auth.login.loading") : t("auth.login.submit")}
            </button>
          </form>
          <p className={styles.statSubtext}>
            {t("auth.login.forgot_password")}
            <Link to="/login/forgot-password" className={`${styles.linkSuccess} ${styles.linkSuccessWide}`}>
              {t("auth.login.recover")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;

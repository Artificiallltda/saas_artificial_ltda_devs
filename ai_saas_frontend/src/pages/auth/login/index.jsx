import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import styles from "./login.module.css";
import { User, LockKeyhole } from "lucide-react";
import { toast } from "react-toastify";
import { authRoutes } from "../../../services/apiRoutes";

function Login() {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        throw new Error(
          "Você excedeu o limite de tentativas. Tente novamente em alguns minutos."
        );
      }

      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) throw new Error(data?.error || "Erro ao fazer login");

      loginSuccess(data);
      toast.success("Usuário logado com sucesso!");
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
          <img
            src="/static/artificiall/Artificiall_Negativo_Vert_RGB.png"
            alt="Logo"
            className="w-64 h-auto artificiall-logo"
          />
        </div>

        <div className={styles.loginRight}>
          <h1 className={styles.title}>Login</h1>

          <form onSubmit={handleLogin} className="w-full max-w-sm">
            {/* IDENTIFIER */}
            <div className="relative w-full my-4">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--icon-muted)] w-4 h-4" />
              <input
                type="text"
                placeholder="Usuário ou Email"
                className="w-full pl-10 py-2 rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--border)",
                }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* PASSWORD */}
            <div className="relative w-full my-4">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--icon-muted)] w-4 h-4" />
              <input
                type="password"
                placeholder="Senha"
                className="w-full pl-10 py-2 rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--border)",
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={`${styles.btn} ${styles.btnWide}`}
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className={styles.statSubtext}>
            Esqueceu a Senha?
            <Link
              to="/login/forgot-password"
              className={`${styles.linkSuccess} ${styles.linkSuccessWide}`}
            >
              Recuperar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import styles from "./login.module.css";
import { User, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import { authRoutes } from "../../../services/apiRoutes";

function Login() {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

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
        throw new Error("Você excedeu o limite de tentativas. Tente novamente em alguns minutos.");
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
          <img src="/static/artificiall/Artificiall_Negativo_Vert_RGB.png" alt="Logo" className="w-64 h-auto" />
        </div>
        <div className={styles.loginRight}>
          <h1 className={styles.title}>Login</h1>
          <form onSubmit={handleLogin} className="w-full max-w-sm">
            <div className="relative w-full my-4">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Usuário ou Email"
                className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="relative w-full my-4">
              <LockKeyhole className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                className="w-full pl-10 pr-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
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
            <Link to="/login/forgot-password" className={`${styles.linkSuccess} ${styles.linkSuccessWide}`}>
              Recuperar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;

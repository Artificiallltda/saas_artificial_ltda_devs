import { useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import styles from "./forgot.module.css";
import {  Mail, ArrowLeft} from "lucide-react";
import { authRoutes } from "../../../services/apiRoutes";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(authRoutes.requestPasswordReset, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Erro ao solicitar redefinição");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.pageBackground}>
      <section className={styles.statCard}>
        <Link to="/login" className={styles.loginLink}>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-700 hover:text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
          </button>
          Login
        </Link>
        <h1 className={styles.title}>Redefinir senha</h1>
        <form onSubmit={handleSubmit}>
          <div className="max-w-md w-full my-4">
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="email"
                    placeholder="Seu email"
                    className="w-xs pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    />
            </div>
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnWide}`}
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      </section>
    </main>
  );
}
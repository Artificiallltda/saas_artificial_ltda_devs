import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, ArrowLeft } from "lucide-react";
import Layout from "../../../components/layout/Layout";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import styles from "../profile.module.css";
import { userRoutes, notificationRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService";
import { useNotifications } from "../../../context/NotificationContext";

export default function EditName() {
  const { user, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "" });
  const [loading, setLoading] = useState(false);
  const { fetchNotifications } = useNotifications();

  // Preencher nome atual ao carregar
  useEffect(() => {
    if (user?.full_name) {
      setForm({ full_name: user.full_name });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Atualiza nome completo
      await apiFetch(userRoutes.updateUser(user.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: form.full_name }),
      });

      toast.success("Nome atualizado com sucesso!");

      // Cria notificação
      await apiFetch(notificationRoutes.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Seu nome foi alterado!`,
          link: "/profile",
        }),
      });

      fetchNotifications(); // atualiza contexto de notificações

      // Busca usuário atualizado (GET normal)
      const updatedUser = await fetch(userRoutes.getCurrentUser(), {
        credentials: "include",
      }).then((res) => res.json());

      loginSuccess({ user: updatedUser });

      navigate("/profile/security");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

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
                    Perfil
                  </Link>
                  <span>/</span>
                  <Link to="/profile/security" className="text-gray-700 hover:text-black">
                    Security
                  </Link>
                  <span>/</span>
                  <span className="text-gray-500">Editar Nome</span>
                </nav>
              </div>
      <section className="flex flex-col items-center justify-center space-y-6">
        <h1 className={`${styles.title} text-center`}>Atualizar Nome Completo</h1>

        <form onSubmit={handleSubmit} className="w-full max-w-md">
            <div className={styles.statCard}>
              <p className={`${styles.statSubtext} mb-4`}>
                Se desejar, você pode alterar o nome associado à sua conta na plataforma.
              </p>

              <p className={`${styles.blockTitle} text-sm mb-2`}>Novo nome</p>
              <div className="relative mb-4">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="full_name"
                  placeholder="Nome completo"
                  value={form.full_name}
                  onChange={handleChange}
                  className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-[var(--color-primary)] text-[var(--on-primary)] py-2 px-4 rounded-md text-sm hover:opacity-90 transition"
                  disabled={!form.full_name || loading}
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
        </form>
      </section>
    </Layout>
  );
}
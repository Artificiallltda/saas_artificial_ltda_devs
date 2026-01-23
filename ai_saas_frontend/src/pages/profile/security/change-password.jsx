import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, ArrowLeft } from "lucide-react";
import Layout from "../../../components/layout/Layout";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import styles from "../profile.module.css";
import { authRoutes, userRoutes, notificationRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService";
import { useNotifications } from "../../../context/NotificationContext";

export default function EditPassword() {
  const { user, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const { fetchNotifications } = useNotifications();

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/;

  useEffect(() => {
    if (form.newPassword && !passwordRegex.test(form.newPassword)) {
      setPasswordError(
        "A nova senha deve ter pelo menos 8 caracteres, uma maiúscula, uma minúscula, um número e um caractere especial"
      );
    } else {
      setPasswordError("");
    }
  }, [form.newPassword]);

  const isFormValid =
    form.oldPassword &&
    form.newPassword &&
    form.confirmNewPassword &&
    passwordError === "" &&
    form.newPassword === form.confirmNewPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.oldPassword === form.newPassword) {
      toast.error("A nova senha não pode ser igual à senha atual.");
      return;
    }
    setLoading(true);

    try {
      // Verifica senha atual
      await apiFetch(authRoutes.verifyPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.oldPassword }),
      });

      // Atualiza senha
      await apiFetch(userRoutes.updateUser(user.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_password: form.oldPassword,
          password: form.newPassword,
        }),
      });

      toast.success("Senha atualizada com sucesso!");

      // Cria notificação
      await apiFetch(notificationRoutes.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Sua senha foi alterada!",
          link: "/profile",
        }),
      });

      fetchNotifications();

      // Busca usuário atualizado
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
                  <span className="text-gray-500">Editar Senha</span>
                </nav>
              </div>
      <section className="flex flex-col items-center justify-center space-y-6">
        <h1 className={`${styles.title} text-center`}>Atualizar Senha</h1>

        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className={styles.statCard}>
            <p className={`${styles.statSubtext} mb-4`}>
              Para sua segurança, insira sua senha atual e defina uma nova senha forte.
            </p>

            {/* Senha atual */}
            <div className="relative mb-4">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                name="oldPassword"
                placeholder="Senha atual"
                value={form.oldPassword}
                onChange={handleChange}
                className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                required
              />
            </div>

            {/* Nova senha */}
            <div className="relative mb-2">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                name="newPassword"
                placeholder="Nova senha"
                value={form.newPassword}
                onChange={handleChange}
                className={`w-full pl-10 py-2 rounded-lg border text-black text-sm shadow-sm focus:outline-none focus:shadow-md ${
                  passwordError ? "border-red-400" : "border-gray-300"
                }`}
                required
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-500 mt-1">{passwordError}</p>
            )}

            {/* Confirmar nova senha */}
            <div className="relative mb-2 mt-4">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                name="confirmNewPassword"
                placeholder="Confirmar nova senha"
                value={form.confirmNewPassword}
                onChange={handleChange}
                className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                required
              />
            </div>
            {form.newPassword &&
              form.confirmNewPassword &&
              form.newPassword !== form.confirmNewPassword && (
                <p className="text-sm text-red-500 mt-1">As senhas não coincidem</p>
              )}

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="bg-[var(--color-primary)] text-[var(--on-primary)] py-2 px-4 rounded-md text-sm hover:opacity-90 transition"
                disabled={!isFormValid || loading}
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

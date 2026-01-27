import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import styles from "./register.module.css";
import { User, LockKeyhole, Mail, Image as ImageIcon, UserCircle, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { authRoutes } from "../../../services/apiRoutes";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [photoFile, setPhotoFile] = useState(null); // imagem
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/;

  const location = useLocation();
  const emailFromState = location.state?.email;

  useEffect(() => {
    if (emailFromState) {
      setForm((prev) => ({ ...prev, email: emailFromState }));
    }
  }, [emailFromState]);

  useEffect(() => {
    if (form.email && !emailRegex.test(form.email)) {
      setEmailError("E-mail inválido");
    } else {
      setEmailError("");
    }

    if (form.password && !passwordRegex.test(form.password)) {
      setPasswordError(
        "A senha deve ter pelo menos 8 caracteres, uma maiúscula, uma minúscula, um número e um caractere especial"
      );
    } else {
      setPasswordError("");
    }
  }, [form.email, form.password]);

  const isFormValid =
    form.full_name &&
    form.username &&
    form.email &&
    form.password &&
    form.confirmPassword &&
    !emailError &&
    !passwordError &&
    form.password === form.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    setPhotoFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const formData = new FormData();
    for (const key in form) {
      formData.append(key, form[key]);
    }
    if (photoFile) {
      formData.append("perfil_photo", photoFile);
    }

    const res = await fetch(authRoutes.register, {
      method: "POST",
      body: formData,
    });

    let data = null;
    try {
      data = await res.clone().json();
    } catch {
    }

    if (!res.ok) {
      const errorMsg = data?.error || "Erro inesperado no servidor";
      throw new Error(errorMsg);
    }

    toast.success("Usuário cadastrado com sucesso!");
    navigate("/login");
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
          Login
        </Link>
        <h1 className={styles.title}>Cadastro</h1>
        <form onSubmit={handleSubmit}>
          <div className="w-full my-4">
            <div className="relative">
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
          </div>

          <div className="w-full my-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                required
              />
            </div>
          </div>

          <div className="w-full my-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                disabled
                className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm bg-gray-100 cursor-not-allowed"
              />
            </div>
            {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
          </div>

          <div className="w-full my-4">
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                name="password"
                placeholder="Senha"
                value={form.password}
                onChange={handleChange}
                className={`w-full pl-10 py-2 rounded-lg border text-black text-sm shadow-sm focus:outline-none focus:shadow-md ${
                  passwordError ? "border-red-400" : "border-gray-300"
                }`}
                required
              />
            </div>
            {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
          </div>

          <div className="w-full my-4">
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirmar senha"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                required
              />
            </div>
            {form.password &&
              form.confirmPassword &&
              form.password !== form.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">As senhas não coincidem</p>
              )}
          </div>

          <div className="w-full my-4">
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <ImageIcon className="w-4 h-4" />
              <span>Foto de perfil (opcional)</span>
              <input
                type="file"
                name="perfil_photo"
                accept="image/*"
                onChange={handlePhotoChange}
                className="ml-2"
              />
            </label>
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnWide}`}
            disabled={!isFormValid || loading}
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className={styles.statSubtext}>
          Já tem uma conta?
          <Link to="/login" className={`${styles.linkSuccess} ${styles.linkSuccessWide}`}>
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
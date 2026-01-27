import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../../../components/layout/Layout";
import { User, LockKeyhole, Mail, UserCircle, ArrowLeft, Layers, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import CustomSelect from "../../../components/common/CustomSelect";
import { adminRoutes, plansRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService";
import styles from "../admin.module.css";
import { useLanguage } from "../../../context/LanguageContext";

export default function AdminCreateUser() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    plan_id: "",
  });
  const [plans, setPlans] = useState([]);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/;

  // Carregar planos
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await apiFetch(plansRoutes.list);
        setPlans(data || []);
      } catch (err) {
        toast.error(err.message || t("admin.create_user.plans.load_error"));
      }
    };
    fetchPlans();
  }, []);

  // Validação em tempo real
  useEffect(() => {
    setEmailError(form.email && !emailRegex.test(form.email) ? t("admin.create_user.validation.invalid_email") : "");
    setPasswordError(
      form.password && !passwordRegex.test(form.password)
        ? t("admin.create_user.validation.password_requirements")
        : ""
    );
  }, [form.email, form.password]);

  const isFormValid =
    form.full_name &&
    form.username &&
    form.email &&
    form.password &&
    form.confirmPassword &&
    form.plan_id &&
    !emailError &&
    !passwordError &&
    form.password === form.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("full_name", form.full_name);
      formData.append("username", form.username);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("role", "user");
      formData.append("plan_id", form.plan_id);

      await apiFetch(adminRoutes.createUser(), {
        method: "POST",
        body: formData,
      });

      toast.success(t("admin.create_user.success"));
      navigate("/admin/users");
    } catch (err) {
      toast.error(err.message || t("admin.create_user.error"));
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
          <Link to="/admin" className="text-gray-700 hover:text-black">
            {t("admin.title")}
          </Link>
          <span>/</span>
          <span className="text-gray-500">{t("admin.users.title")}</span>
        </nav>
      </div>

      <section className="bg-white rounded-xl shadow-md p-6 max-w-lg mx-auto">
        <h1 className="text-xl font-semibold mb-6">{t("admin.create_user.title")}</h1>
        <form onSubmit={handleSubmit}>
          {/* Nome */}
          <div className="relative mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <UserCircle className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              name="full_name"
              placeholder={t("admin.create_user.full_name.placeholder")}
              value={form.full_name}
              onChange={handleChange}
              className="w-full h-11 pl-10 pr-10 rounded-lg border border-gray-300 text-black text-sm shadow-sm focus:outline-none focus:shadow-md"
              required
            />
          </div>

          {/* Username */}
          <div className="relative mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <User className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              name="username"
              placeholder={t("admin.create_user.username.placeholder")}
              value={form.username}
              onChange={handleChange}
              className="w-full h-11 pl-10 pr-10 rounded-lg border border-gray-300 text-black text-sm shadow-sm focus:outline-none focus:shadow-md"
              required
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Mail className="text-gray-400 w-4 h-4" />
              </div>
              <input
                type="email"
                name="email"
                placeholder={t("admin.create_user.email.placeholder")}
                value={form.email}
                onChange={handleChange}
                className="w-full h-11 pl-10 pr-10 rounded-lg border border-gray-300 text-black text-sm shadow-sm focus:outline-none focus:shadow-md"
                required
              />
            </div>
            <p className="h-5 ml-10 text-xs text-red-500 mt-1">{emailError || "\u00A0"}</p>
          </div>

          {/* Senha */}
          <div className="mb-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <LockKeyhole className="text-gray-400 w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t("admin.create_user.password.placeholder")}
                value={form.password}
                onChange={handleChange}
                className={`w-full h-11 pl-10 pr-10 rounded-lg border text-black text-sm shadow-sm focus:outline-none focus:shadow-md ${
                  passwordError ? "border-red-400" : "border-gray-300"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? t("admin.create_user.password.hide") : t("admin.create_user.password.show")}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="h-5 ml-10 text-xs text-red-500 mt-1">{passwordError || "\u00A0"}</p>
          </div>

          {/* Confirmar senha */}
          <div className="mb-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <LockKeyhole className="text-gray-400 w-4 h-4" />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder={t("admin.create_user.confirm_password.placeholder")}
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full h-11 pl-10 pr-10 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showConfirm ? t("admin.create_user.password.hide") : t("admin.create_user.password.show")}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="h-5 ml-10 text-xs text-red-500 mt-1">
              {(form.password && form.confirmPassword && form.password !== form.confirmPassword)
                ? t("admin.create_user.validation.password_mismatch")
                : "\u00A0"}
            </p>
          </div>

          {/* Plano */}
          <div className="relative mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Layers className="text-gray-400 w-4 h-4" />
            </div>
            <CustomSelect
              value={plans.find((p) => p.id === form.plan_id) || null}
              onChange={(selected) => setForm((prev) => ({ ...prev, plan_id: selected?.id || "" }))}
              options={plans}
              getOptionLabel={(p) => p.name}
              getOptionValue={(p) => p.id}
              placeholder={t("admin.create_user.plan.placeholder")}
              className="pl-10 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="mt-4 w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? t("admin.create_user.loading") : t("admin.create_user.submit")}
          </button>
        </form>
      </section>
    </Layout>
  );
}

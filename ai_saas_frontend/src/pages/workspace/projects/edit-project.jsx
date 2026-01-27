import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Layout from "../../../components/layout/Layout";
import styles from "./projects.module.css";
import { toast } from "react-toastify";
import { projectRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService";
import { useLanguage } from "../../../context/LanguageContext";
import { backendMessageKeyMap } from "../../../i18n";

export default function EditProject() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchProject = async () => {
    try {
      const res = await fetch(projectRoutes.get(id), {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || t("projects.edit.load_error"));

      setProject(data);
      setName(data.name);
      setDescription(data.description || "");
    } catch (err) {
      const key = backendMessageKeyMap[err.message];
      toast.error(key ? t(key) : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("projects.validation.name_required"));
      return;
    }

    setSaving(true);
      try {
        await apiFetch(projectRoutes.update(id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
        toast.success(t("projects.edit.success"));
        navigate("/workspace/projects");
      } catch (err) {
        const key = backendMessageKeyMap[err.message];
        toast.error(key ? t(key) : err.message);
      } finally {
        setSaving(false);
      }
    };

  useEffect(() => {
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <p className="p-4 text-sm">{t("projects.edit.loading")}</p>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <p className="p-4 text-sm text-red-500">{t("projects.edit.not_found")}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.returnLink}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-700 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <nav className="flex items-center text-sm space-x-1">
          <Link to="/" className="text-gray-700 hover:text-black">
            {t("breadcrumbs.dashboard")}
          </Link>
          <span>/</span>
          <Link to="/workspace/projects" className="text-gray-700 hover:text-black">
            {t("breadcrumbs.projects")}
          </Link>
          <span>/</span>
          <span className="text-gray-500">{t("breadcrumbs.edit")}</span>
        </nav>
      </div>
      <section className="flex flex-col items-center justify-center space-y-6">
        <h1 className={styles.title}>{t("projects.edit.title")}</h1>
        <div className={styles.statCard}>
          <p className={styles.statSubtext}>{t("projects.edit.subtitle")}</p>
          <div className="relative mt-4 mb-3">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t("projects.fields.name.placeholder_short")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 py-2 rounded-lg border border-gray-300 text-black text-sm shadow-sm focus:outline-none focus:shadow-md"
              required
            />
          </div>
          <textarea
            placeholder={t("projects.fields.description.placeholder_short")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
            className="w-full mt-2 pl-3 py-2 rounded-lg border border-gray-300 text-black text-sm shadow-sm focus:outline-none focus:shadow-md"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-black text-white py-2 px-4 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("common.save_changes")}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
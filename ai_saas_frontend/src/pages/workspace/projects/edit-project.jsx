import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Layout from "../../../components/layout/Layout";
import styles from "./projects.module.css";
import { toast } from "react-toastify";
import { projectRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService";

export default function EditProject() {
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

      if (!res.ok) throw new Error(data.error || "Erro ao carregar projeto");

      setProject(data);
      setName(data.name);
      setDescription(data.description || "");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("O nome do projeto é obrigatório.");
      return;
    }

    setSaving(true);
      try {
        await apiFetch(projectRoutes.update(id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
        toast.success("Projeto atualizado com sucesso!");
        navigate("/workspace/projects");
      } catch (err) {
        toast.error(err.message);
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
        <p className="p-4 text-sm">Carregando projeto...</p>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <p className="p-4 text-sm text-red-500">Projeto não encontrado.</p>
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
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/workspace/projects" className="text-gray-700 hover:text-black">
            Projetos
          </Link>
          <span>/</span>
          <span className="text-gray-500">Editar</span>
        </nav>
      </div>
      <section className="flex flex-col items-center justify-center space-y-6">
        <h1 className={styles.title}>Editar Projeto</h1>
        <div className={styles.statCard}>
          <p className={styles.statSubtext}>Altere o nome ou a descrição do projeto.</p>
          <div className="relative mt-4 mb-3">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Nome do projeto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 py-2 rounded-lg border border-gray-300 text-black text-sm shadow-sm focus:outline-none focus:shadow-md"
              required
            />
          </div>
          <textarea
            placeholder="Descrição do projeto..."
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
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
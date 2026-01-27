import { useState } from "react";
import styles from "./home.module.css";
import Layout from "../../components/layout/Layout";
import { Plus, FileText, Image, Video } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useProjects } from "../../hooks/useProjects";
import { useContents } from "../../hooks/useContents";
import { toast } from "react-toastify";
import NewProjectModal from "../../components/modals/NewProjectModal";
import { apiFetch } from "../../services/apiService";
import { projectRoutes } from "../../services/apiRoutes";
import { EmptyState } from "../../components/EmptyState";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { projects, projectsThisMonth } = useProjects(user);
  const { contents, contentsThisMonth } = useContents(user);

  const [showProjectModal, setShowProjectModal] = useState(false);

  const createProject = async ({ name, description }) => {
    try {
      await apiFetch(projectRoutes.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      toast.success("Projeto criado com sucesso!");

      // ✅ fluxo correto: volta para lista de projetos
      navigate("/workspace/projects");

    } catch (err) {
      toast.error(err.message || "Erro ao criar projeto");
    }
  };

  return (
    <Layout>
      <section className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className="text-gray-600">
              Bem-vindo à sua plataforma de IA generativa
            </p>
          </div>

          <button
            onClick={() => setShowProjectModal(true)}
            className={`${styles.btnBlack} ${styles.btnBlackStandard}`}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Novo Projeto</span>
          </button>
        </div>

        {/* Cards de estatísticas */}
        <div className={styles.panelGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <p className={styles.blockTitle}>Agentes Criados</p>
            </div>
            <p className="text-2xl font-bold">
              {user?.tokens_available ?? 0}
            </p>
            <p className={`${styles.statSubtext} text-xs`}>
              Funcionalidade futura!
            </p>
          </div>

          <div
            className={`${styles.statCard} cursor-pointer hover:opacity-80`}
            onClick={() => navigate("/workspace/projects")}
          >
            <div className={styles.statHeader}>
              <p className={styles.blockTitle}>Projetos</p>
              <FileText className="w-4 h-4 text-gray-medium" />
            </div>
            <p className="text-2xl font-bold">{projects.length}</p>
            <p className={`${styles.statSubtext} text-xs`}>
              +{projectsThisMonth} novos este mês
            </p>
          </div>

          <div
            className={`${styles.statCard} cursor-pointer hover:opacity-80`}
            onClick={() => navigate("/workspace/generated-contents")}
          >
            <div className={styles.statHeader}>
              <p className={styles.blockTitle}>Conteúdo Gerado</p>
              <Image className="w-4 h-4 text-gray-medium" />
            </div>
            <p className="text-2xl font-bold">{contents.length}</p>
            <p className={`${styles.statSubtext} text-xs`}>
              +{contentsThisMonth} criados este mês
            </p>
          </div>
        </div>

        {/* Ferramentas IA */}
        <div>
          <h2 className={styles.subTitle}>Ferramentas de IA</h2>

          <div className={styles.panelGrid}>
            <div className={styles.statCard}>
              <div>
                <div className="bg-primary w-fit p-3 rounded-lg mb-4">
                  <FileText className="text-white w-6 h-6" />
                </div>
                <h3 className="font-semibold text-black mb-1">
                  Geração de Texto
                </h3>
                <p className={`${styles.statSubtext} text-sm`}>
                  Crie conteúdo usando LLMs avançados
                </p>
              </div>
              <Link
                to="/text-generation"
                className={`${styles.btnBlack} ${styles.btnBlackWide}`}
              >
                Começar
              </Link>
            </div>

            <div className={styles.statCard}>
              <div>
                <div className="bg-accent-purple w-fit p-3 rounded-lg mb-4">
                  <Image className="text-white w-6 h-6" />
                </div>
                <h3 className="font-semibold text-black mb-1">
                  Geração de Imagem
                </h3>
                <p className={`${styles.statSubtext} text-sm`}>
                  Gere imagens a partir de prompts
                </p>
              </div>
              <Link
                to="/image-generation"
                className={`${styles.btnBlack} ${styles.btnBlackWide}`}
              >
                Começar
              </Link>
            </div>

            <div className={styles.statCard}>
              <div>
                <div className="bg-success w-fit p-3 rounded-lg mb-4">
                  <Video className="text-white w-6 h-6" />
                </div>
                <h3 className="font-semibold text-black mb-1">
                  Geração de Vídeo
                </h3>
                <p className={`${styles.statSubtext} text-sm`}>
                  Crie vídeos com IA generativa
                </p>
              </div>
              <Link
                to="/video-generation"
                className={`${styles.btnBlack} ${styles.btnBlackWide}`}
              >
                Começar
              </Link>
            </div>
          </div>
        </div>

        {/* Projetos recentes */}
        <div>
          <h2 className={styles.subTitle}>Projetos Recentes</h2>

          {projects.length === 0 ? (
            <EmptyState
              title="Nenhum projeto ainda"
              description="Você ainda não criou nenhum projeto. Comece agora para gerar seu primeiro conteúdo com IA."
              ctaLabel="Criar novo projeto"
              onCtaClick={() => setShowProjectModal(true)}
            />
          ) : (
            <div
              className={`${styles.blockCard} divide-y divide-gray-300 cursor-pointer`}
              onClick={() => navigate("/workspace/projects")}
            >
              {[...projects]
                .reverse()
                .slice(0, 3)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-semibold text-black mb-1">
                        {item.name}
                      </p>
                      <p className={`${styles.statSubtext} text-sm`}>
                        {item.description || "Sem descrição"}
                      </p>
                    </div>
                    <p className={`${styles.statSubtext} text-sm`}>
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal Novo Projeto */}
      <NewProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onCreate={createProject}
      />
    </Layout>
  );
}

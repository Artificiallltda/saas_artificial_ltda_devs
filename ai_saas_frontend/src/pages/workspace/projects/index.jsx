import { useState } from "react";
import Layout from "../../../components/layout/Layout";
import styles from "./projects.module.css";
import { Plus, Search, FolderPlus } from "lucide-react";
import { toast } from "react-toastify";
import useProjectsFetch from "../hooks/useProjectsFetch";
import ProjectCard from "../components/ProjectCard";
import ProjectDetailsModal from "../components/ProjectDetailsModal";
import ProjectModal from "../components/ProjectModal";
import { projectRoutes } from "../../../services/apiRoutes";
import FiltersPanel from "../components/FiltersPanel";
import { formatDate, formatDateTime } from "../../../utils/dateUtils";
import SortMenu from "../components/SortMenu";
import { apiFetch } from "../../../services/apiService";
import { EmptyState } from "../../../components/EmptyState";
import { useLanguage } from "../../../context/LanguageContext";
import { backendMessageKeyMap } from "../../../i18n";

export default function ProjectsList() {
  const { t, language } = useLanguage();
  const {
    loading,
    projects,
    loadProjects,
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    sortBy,
    setSortBy,
    setProjects,
  } = useProjectsFetch();

  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [loadingProject, setLoadingProject] = useState(false);
  const [errorProject, setErrorProject] = useState("");

  // 🔴 FUNÇÃO DEDICADA (IMPORTANTE)
  const handleOpenCreateModal = () => {
    setShowProjectModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("projects.delete.confirm"))) return;
    try {
      await apiFetch(projectRoutes.delete(id), { method: "DELETE" });
      toast.success(t("projects.delete.success"));
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const key = backendMessageKeyMap[err.message];
      toast.error(key ? t(key) : err.message);
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      setErrorProject(t("projects.validation.name_required"));
      return;
    }

    setLoadingProject(true);
    setErrorProject("");

    try {
      await apiFetch(projectRoutes.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
        }),
      });

      toast.success(t("projects.create.success"));
      await loadProjects();
      setShowProjectModal(false);
      setProjectName("");
      setProjectDescription("");
    } catch (err) {
      const key = backendMessageKeyMap[err.message];
      setErrorProject(key ? t(key) : err.message);
    } finally {
      setLoadingProject(false);
    }
  };

  return (
    <Layout>
      <h1 className={styles.title}>{t("projects.title")}</h1>
      <p className="text-gray-600 mb-6">
        {t("projects.subtitle")}
      </p>

      {/* Barra de ações */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="search"
            placeholder={t("projects.search.placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 py-2 bg-white rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
          />
        </div>

        <div className="flex gap-3 items-center">
          <FiltersPanel
            activeTab="project"
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            filterModel=""
            setFilterModel={() => {}}
            filterStyle=""
            setFilterStyle={() => {}}
            filterRatio=""
            setFilterRatio={() => {}}
            filterTempMin=""
            setFilterTempMin={() => {}}
            filterTempMax=""
            setFilterTempMax={() => {}}
            filterDurMin=""
            setFilterDurMin={() => {}}
            filterDurMax=""
            setFilterDurMax={() => {}}
          />

          <SortMenu
            activeTab="project"
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          <button
            onClick={handleOpenCreateModal}
            className={`${styles.btnBlack} ${styles.btnBlackStandard}`}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">{t("projects.create.cta")}</span>
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <p className="mt-6 text-sm">{t("projects.loading")}</p>
      ) : projects.length === 0 ? (
        <div onClick={(e) => e.stopPropagation()}>
          <EmptyState
            icon={FolderPlus}
            title={t("projects.empty.title")}
            description={t("projects.empty.description")}
            ctaLabel={t("projects.empty.cta")}
            onCtaClick={handleOpenCreateModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
              onSelect={setSelectedProject}
              formatDate={(d) => formatDate(d, language)}
            />
          ))}
        </div>
      )}

      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          formatDateTime={(d) => formatDateTime(d, language)}
        />
      )}

      {showProjectModal && (
        <ProjectModal
          onClose={() => setShowProjectModal(false)}
          onCreate={createProject}
          name={projectName}
          setName={setProjectName}
          description={projectDescription}
          setDescription={setProjectDescription}
          loading={loadingProject}
          error={errorProject}
        />
      )}
    </Layout>
  );
}

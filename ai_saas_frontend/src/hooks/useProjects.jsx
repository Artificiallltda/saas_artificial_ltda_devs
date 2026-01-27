import { useEffect, useState } from "react";
import { projectRoutes } from "../services/apiRoutes";
import { toast } from "react-toastify";
import { useLanguage } from "../context/LanguageContext";

export function useProjects(user) {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [projectsThisMonth, setProjectsThisMonth] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      try {
        const res = await fetch(projectRoutes.list, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "dashboard.projects.load_error");

        setProjects(data);

        const now = new Date();
        const count = data.filter((p) => {
          const createdAt = new Date(p.created_at);
          return (
            createdAt.getMonth() === now.getMonth() &&
            createdAt.getFullYear() === now.getFullYear()
          );
        }).length;

        setProjectsThisMonth(count);
      } catch (err) {
        const msg = err?.message || "dashboard.projects.load_error";
        toast.error(msg.startsWith("dashboard.") ? t(msg) : msg);
      }
    };

    fetchProjects();
  }, [user]);

  return { projects, projectsThisMonth };
}
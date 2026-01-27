import { useEffect, useState } from "react";
import { projectRoutes } from "../services/apiRoutes";
import { toast } from "react-toastify";

export function useProjects(user) {
  const [projects, setProjects] = useState([]);
  const [projectsThisMonth, setProjectsThisMonth] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      try {
        const res = await fetch(projectRoutes.list, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar projetos");

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
        toast.error(err.message);
      }
    };

    fetchProjects();
  }, [user]);

  return { projects, projectsThisMonth };
}
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { generatedContentRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService"

export default function useContentsFetch() {
  const [loading, setLoading] = useState(true);
  const [allContents, setAllContents] = useState([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(generatedContentRoutes.list, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erro ao buscar conteúdos");
        const contents = await res.json();
        setAllContents(contents);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleDeleteContent(id) {
    if (!window.confirm("Tem certeza que quer deletar este conteúdo?")) return;
    try {
      await apiFetch(`${generatedContentRoutes.list}/${id}`, {
        method: "DELETE"
      });
      setAllContents((prev) => prev.filter((c) => c.id !== id));
      toast.success("Conteúdo deletado com sucesso!");
    } catch (err) {
      toast.error(err.message);
    }
  }

  return {
    loading,
    allContents,
    setAllContents,
    handleDeleteContent,
  };
}

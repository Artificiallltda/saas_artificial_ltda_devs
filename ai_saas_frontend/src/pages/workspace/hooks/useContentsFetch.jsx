import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { generatedContentRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService"
import { useLanguage } from "../../../context/LanguageContext";

export default function useContentsFetch() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [allContents, setAllContents] = useState([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(generatedContentRoutes.list, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("contents.load_error");
        const contents = await res.json();
        setAllContents(contents);
      } catch (err) {
        const msg = err?.message || "contents.load_error";
        toast.error(msg.startsWith("contents.") ? t(msg) : msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleDeleteContent(id) {
    if (!window.confirm(t("contents.delete.confirm_single"))) return;
    try {
      await apiFetch(`${generatedContentRoutes.list}/${id}`, {
        method: "DELETE"
      });
      setAllContents((prev) => prev.filter((c) => c.id !== id));
      toast.success(t("contents.delete.success_single"));
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

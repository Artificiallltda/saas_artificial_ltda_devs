import { useEffect, useState } from "react";
import { generatedContentRoutes } from "../services/apiRoutes";
import { toast } from "react-toastify";
import { useLanguage } from "../context/LanguageContext";

export function useContents(user) {
  const { t } = useLanguage();
  const [contents, setContents] = useState([]);
  const [contentsThisMonth, setContentsThisMonth] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchContents = async () => {
      try {
        const res = await fetch(generatedContentRoutes.list, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "dashboard.contents.load_error");

        setContents(data);

        const now = new Date();
        const count = data.filter((c) => {
          const createdAt = new Date(c.created_at);
          return (
            createdAt.getMonth() === now.getMonth() &&
            createdAt.getFullYear() === now.getFullYear()
          );
        }).length;

        setContentsThisMonth(count);
      } catch (err) {
        const msg = err?.message || "dashboard.contents.load_error";
        toast.error(msg.startsWith("dashboard.") ? t(msg) : msg);
      }
    };

    fetchContents();
  }, [user]);

  return { contents, contentsThisMonth };
}
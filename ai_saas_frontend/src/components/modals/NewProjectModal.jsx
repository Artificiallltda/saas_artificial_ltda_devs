import { useState } from "react";
import { X } from "lucide-react";

export default function NewProjectModal({ isOpen, onClose, onCreate }) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      setErrorMsg("O nome do projeto é obrigatório.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await onCreate({
        name: projectName,
        description: projectDescription,
      });
      setProjectName("");
      setProjectDescription("");
    } catch (err) {
      setErrorMsg(err.message || "Erro ao criar projeto");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
      <div className="
        relative w-full max-w-md rounded-xl p-9 shadow-xl
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-800
        text-neutral-900 dark:text-neutral-100
      ">
        {/* FECHAR */}
        <button
          className="
            absolute top-3 right-3 p-1.5 rounded-full
            hover:bg-gray-100 dark:hover:bg-neutral-800
            transition
          "
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
        </button>

        <h2 className="text-lg font-semibold">Novo Projeto</h2>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
          Dê um nome e uma breve descrição para organizar seu conteúdo.
        </p>

        {/* NOME */}
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">
            Nome
          </label>
          <input
            type="text"
            placeholder="Ex: Campanha de Marketing"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="
              w-full mt-1 px-3 py-2 rounded-lg border text-sm
              bg-white dark:bg-neutral-950
              text-neutral-900 dark:text-neutral-100
              border-gray-300 dark:border-neutral-800
              placeholder:text-gray-400 dark:placeholder:text-neutral-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/40
            "
          />
        </div>

        {/* DESCRIÇÃO */}
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">
            Descrição
          </label>
          <textarea
            placeholder="Descrição opcional..."
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            rows="3"
            className="
              w-full mt-1 px-3 py-2 rounded-lg border text-sm resize-none
              bg-white dark:bg-neutral-950
              text-neutral-900 dark:text-neutral-100
              border-gray-300 dark:border-neutral-800
              placeholder:text-gray-400 dark:placeholder:text-neutral-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/40
            "
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-500 mb-2">{errorMsg}</p>
        )}

        {/* AÇÕES */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="
              px-4 py-2 rounded-md text-sm font-medium
              bg-neutral-900 text-white
              hover:opacity-90 transition
              disabled:opacity-50
              dark:bg-white dark:text-neutral-900
            "
          >
            {loading ? "Criando..." : "Criar Projeto"}
          </button>
        </div>
      </div>
    </div>
  );
}
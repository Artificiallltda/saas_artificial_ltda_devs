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
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-50">
      <div className="bg-white rounded-lg p-9 w-full max-w-md shadow-lg relative">
        <button
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900">Novo Projeto</h2>
        <p className="text-sm text-gray-600 mb-4">
          Dê um nome e uma breve descrição para organizar seu conteúdo.
        </p>

        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700">Nome</label>
          <input
            type="text"
            placeholder="Ex: Campanha de Marketing"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full mt-1 pl-3 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
          />
        </div>

        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            placeholder="Descrição opcional..."
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            className="w-full mt-1 pl-3 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
            rows="3"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-500 mb-2">{errorMsg}</p>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-black text-white py-2 px-4 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar Projeto"}
          </button>
        </div>
      </div>
    </div>
  );
}

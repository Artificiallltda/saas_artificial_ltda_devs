import { X } from "lucide-react";
import styles from "../projects/projects.module.css";

export default function ProjectModal({ onClose, onCreate, name, setName, description, setDescription, loading, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-50">
      <div className="bg-white rounded-lg p-9 w-full max-w-md shadow-lg relative">
        <button
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h2 className={styles.subTitle}>Novo Projeto</h2>
        <p className="text-sm text-gray-600 mb-4">
          Dê um nome e uma breve descrição para organizar seu conteúdo.
        </p>

        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700">Nome</label>
          <input
            type="text"
            placeholder="Ex: Campanha de Marketing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 pl-3 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
          />
        </div>

        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            placeholder="Descrição opcional..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-1 pl-3 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
            rows="3"
          />
        </div>

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={onCreate}
            disabled={loading}
            className="bg-black text-white py-2 px-4 rounded-md text-sm hover:opacity-90 transition"
          >
            {loading ? "Criando..." : "Criar Projeto"}
          </button>
        </div>
      </div>
    </div>
  );
}

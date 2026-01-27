import React, { useRef, useEffect } from "react";
import { Send, Paperclip, X, Square } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../../context/AuthContext";

const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "application/pdf"];

export default function ChatInput({
  input,
  setInput,
  handleSend,
  handleStop,
  loading,
  files,
  setFiles,
  attachmentsAllowed,
  disabled = false, // ✅ NOVO
}) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const maxHeight = 160;

  // Mapeia as features do plano para key → boolean
  const featuresMap = (user?.plan?.features || []).reduce((acc, pf) => {
    acc[pf.key] = pf.value === "true";
    return acc;
  }, {});

  // Verifica permissão de anexar arquivos
  const finalAttachmentsAllowed = !!featuresMap["attach_files"] && attachmentsAllowed && !disabled;

  const handleFileChange = (e) => {
    if (disabled) {
      toast.info("🚫 Você atingiu sua cota mensal. Faça upgrade para continuar.");
      return;
    }

    if (!finalAttachmentsAllowed) {
      toast.warning("Seu plano atual não permite anexar arquivos.");
      return;
    }

    const newFiles = Array.from(e.target.files);
    const filtered = newFiles.filter((f) => allowedTypes.includes(f.type));
    if (filtered.length < newFiles.length) {
      toast.warning("Alguns arquivos foram ignorados, apenas jpeg, png, gif e pdf são aceitos");
    }
    setFiles((prev) => [...prev, ...filtered]);
  };

  const removeFile = (index) => {
    if (disabled) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + "px";
    }
  }, [input]);

  const placeholder = disabled ? "Cota mensal atingida — faça upgrade para continuar." : "Digite sua mensagem...";

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Lista de arquivos anexados */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm ${
                disabled ? "opacity-70" : ""
              }`}
            >
              {file.type.startsWith("image/") ? (
                <img src={URL.createObjectURL(file)} alt={file.name} className="w-12 h-12 object-cover rounded" />
              ) : (
                <span>{file.name}</span>
              )}

              <button
                onClick={() => removeFile(i)}
                className={`text-red-500 hover:text-red-700 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                disabled={disabled}
                type="button"
                aria-label="Remover arquivo"
                title={disabled ? "Bloqueado por cota" : "Remover"}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Área de input */}
      <div className="flex items-end gap-3">
        {/* Botão de anexos */}
        <button
          type="button"
          onClick={() => finalAttachmentsAllowed && fileInputRef.current.click()}
          disabled={!finalAttachmentsAllowed}
          className={`p-3 rounded-xl hover:bg-gray-100 transition shadow ${
            !finalAttachmentsAllowed ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={
            disabled
              ? "Bloqueado por cota mensal"
              : finalAttachmentsAllowed
              ? "Anexar arquivo"
              : "Melhore seu plano para utilizar este recurso!"
          }
        >
          <Paperclip className="w-6 h-6 text-gray-600" />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          hidden
          accept=".jpeg,.jpg,.png,.gif,.pdf"
          disabled={!finalAttachmentsAllowed}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (disabled) return;

            if (e.key === "Enter" && !e.shiftKey && !loading) {
              e.preventDefault();
              handleSend();
              setInput("");
              setFiles([]);
            }
          }}
          rows={1}
          className={`flex-1 resize-none px-5 py-3 rounded-3xl bg-gray-50 text-gray-900 placeholder-gray-400 overflow-y-auto shadow-sm focus:outline-none focus:shadow-md ${
            disabled ? "opacity-70 cursor-not-allowed" : ""
          }`}
          style={{ maxHeight: maxHeight + "px" }}
        />

        {/* Botão de enviar / parar */}
        {loading ? (
          <button
            onClick={handleStop}
            disabled={disabled}
            className={`p-3 bg-red-600 hover:bg-red-700 text-white rounded-3xl flex items-center justify-center transition ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            type="button"
            title={disabled ? "Bloqueado por cota" : "Parar"}
          >
            <Square className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={() => {
              if (disabled) {
                toast.error("🚫 Você atingiu o limite da sua cota mensal. Faça upgrade para continuar.");
                return;
              }
              handleSend();
            }}
            disabled={disabled}
            className={`p-3 bg-[var(--color-primary)] hover:bg-blue-500 text-white rounded-3xl flex items-center justify-center transition ${
              disabled ? "opacity-50 cursor-not-allowed hover:bg-[var(--color-primary)]" : ""
            }`}
            type="button"
            title={disabled ? "Bloqueado por cota" : "Enviar"}
          >
            <Send className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}

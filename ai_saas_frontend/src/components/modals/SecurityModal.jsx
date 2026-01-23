import { useState, useEffect } from "react";
import { X, Mail } from "lucide-react";

export default function SecurityModal({
  isOpen,
  onClose,
  onVerify,
  onRequestCode,
  loading = false,
  errorMessage = ""
}) {
  const [securityCode, setSecurityCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(120);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    startCooldown();
  }, [isOpen]);

  const startCooldown = () => {
    setCanResend(false);
    setResendCooldown(120);

    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyClick = () => {
    if (!securityCode.trim()) return;
    onVerify(securityCode);
  };

  const handleResendClick = async () => {
    startCooldown();
    await onRequestCode();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
      <div
        className="
          relative w-full max-w-md rounded-xl p-9 shadow-xl
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-800
          text-neutral-900 dark:text-neutral-100
        "
      >
        <button
          className="
            absolute top-3 right-3 p-1.5 rounded-full
            hover:bg-gray-100 dark:hover:bg-neutral-800
            transition
          "
          onClick={onClose}
          aria-label="Fechar"
          type="button"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
        </button>

        <h2 className="text-lg font-semibold">Verificação de Segurança</h2>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
          Enviamos um código para seu e-mail. Digite para continuar.
        </p>

        <div className="flex justify-between items-center mb-3 gap-3">
          <div className="relative w-3/5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Código de segurança"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
              className="
                w-full pl-10 py-2 rounded-lg border text-sm
                bg-white dark:bg-neutral-950
                text-neutral-900 dark:text-neutral-100
                border-gray-300 dark:border-neutral-800
                placeholder:text-gray-400 dark:placeholder:text-neutral-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/40
              "
            />
          </div>

          <button
            onClick={handleVerifyClick}
            disabled={loading}
            className="
              px-4 py-2 rounded-md text-sm font-medium
              bg-neutral-900 text-white
              hover:opacity-90 transition
              disabled:opacity-50
              dark:bg-white dark:text-neutral-900
              whitespace-nowrap
            "
            type="button"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </div>

        {errorMessage && (
          <p className="text-sm text-red-500 text-center">{errorMessage}</p>
        )}

        <button
          onClick={handleResendClick}
          disabled={!canResend || loading}
          className="
            w-full mt-4 text-sm
            text-blue-600 dark:text-blue-400
            hover:underline
            disabled:opacity-50
          "
          type="button"
        >
          {canResend ? "Reenviar código" : `Reenviar em ${resendCooldown}s`}
        </button>
      </div>
    </div>
  );
}
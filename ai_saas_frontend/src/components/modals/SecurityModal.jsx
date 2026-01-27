import { useState, useEffect } from "react";
import { X, Mail } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function SecurityModal({
  isOpen,
  onClose,
  onVerify,
  onRequestCode,
  loading = false,
  errorMessage = ""
}) {
  const { t } = useLanguage();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-50">
      <div className="bg-white rounded-lg p-9 w-full max-w-md shadow-lg relative">
        <button
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900">
          {t("settings.security_modal.title")}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t("settings.security_modal.description")}
        </p>

        <div className="flex justify-between items-center mb-3">
          <div className="relative w-3/5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t("settings.security_modal.code.placeholder")}
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
              className="w-full pl-10 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md"
            />
          </div>

          <button
            onClick={handleVerifyClick}
            disabled={loading}
            className="bg-black text-white py-2 px-4 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? t("settings.security_modal.verify.loading") : t("settings.security_modal.verify.submit")}
          </button>
        </div>

        {errorMessage && (
          <p className="text-sm text-red-500 text-center">{errorMessage}</p>
        )}

        <button
          onClick={handleResendClick}
          disabled={!canResend || loading}
          className="w-full mt-4 text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          {canResend
            ? t("settings.security_modal.resend")
            : t("settings.security_modal.resend_in", { seconds: resendCooldown })}
        </button>
      </div>
    </div>
  );
}
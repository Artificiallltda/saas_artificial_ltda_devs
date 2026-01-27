export default function QuotaBannerSlot({ quota }) {
  const state = quota?.state || "NONE";
  const show = state !== "NONE";
  const isBlock = state === "BLOCK_100";

  const title = isBlock
    ? "🚫 Você atingiu o limite da sua cota mensal."
    : "⚠️ Você já utilizou 80% da sua cota mensal.";

  const message = isBlock
    ? "Faça upgrade do seu plano para continuar usando o chat de IA."
    : "Considere economizar mensagens ou fazer upgrade do seu plano.";

  return (
    <div style={{ minHeight: 68, marginBottom: 10 }}>
      <div
        style={{
          opacity: show ? 1 : 0,
          pointerEvents: show ? "auto" : "none",
          borderRadius: 12,
          padding: "10px 12px",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ marginTop: 4, opacity: 0.9 }}>{message}</div>

        <div style={{ marginTop: 8 }}>
          <a href="/subscription" style={{ textDecoration: "underline" }}>
            Fazer upgrade
          </a>
        </div>
      </div>
    </div>
  );
}

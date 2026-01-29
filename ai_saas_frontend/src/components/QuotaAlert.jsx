export default function QuotaAlert({ monthlyUsage = 0, monthlyQuota = 0 }) {
  if (!monthlyQuota || monthlyQuota <= 0) return null;

  const percent = monthlyUsage / monthlyQuota;

  let text = null;

  if (percent >= 1) {
    text = (
      <>
        🚫 Você atingiu o limite da sua cota mensal.
        <br />
        Faça upgrade do seu plano para continuar usando o chat de IA.
      </>
    );
  } else if (percent >= 0.8) {
    text = (
      <>
        ⚠️ Você já utilizou 80% da sua cota mensal.
        <br />
        Considere economizar mensagens ou fazer upgrade do seu plano.
      </>
    );
  }

  if (!text) return null;

  return <div style={styles.box}>{text}</div>;
}

const styles = {
  box: {
    position: "fixed",
    top: 20,
    right: 20,
    maxWidth: 360,
    padding: "12px 14px",
    borderRadius: 10,
    background: "#111827",
    color: "#fff",
    fontSize: 14,
    lineHeight: 1.35,
    zIndex: 99999,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },
};

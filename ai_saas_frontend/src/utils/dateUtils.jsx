export function fixDateString(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/\.\d+$/, "");
  const fixed = cleaned.endsWith("Z") ? cleaned : cleaned + "Z";
  return new Date(fixed);
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const fixed = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  return new Date(fixed).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const cleaned = dateStr.replace(/\.\d+$/, "");
  const fixed = cleaned.endsWith("Z") ? cleaned : cleaned + "Z";
  return new Date(fixed).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export async function getQuotaStatus() {
  const res = await fetch("http://localhost:8000/api/quota/status", {
    method: "GET",
    credentials: "include", // IMPORTANTÍSSIMO (cookie JWT)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.msg || err.error || "Falha ao buscar quota");
  }

  return res.json();
}

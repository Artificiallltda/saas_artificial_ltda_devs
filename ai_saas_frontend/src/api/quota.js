export async function getQuotaStatus() {
  const res = await fetch("http://localhost:8000/api/quota/status", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Erro ao buscar quota");
  }

  return res.json();
}

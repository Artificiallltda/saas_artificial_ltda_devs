export async function getQuotaStatus(token) {
  const res = await fetch("/api/chats/quota-status", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // se o backend devolver 403 QUOTA_EXCEEDED, ainda queremos o payload
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // retorna o que vier do backend pra UI decidir
    return data || { state: "NONE" };
  }

  return data;
}

const API_URL = "http://127.0.0.1:8000";

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }), // dopasuj do backendu: username lub email
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    // backend zwykle zwraca { detail: "..." } lub inny komunikat
    const msg = payload?.detail || payload?.message || "Błąd logowania";
    throw new Error(msg);
  }
  return payload; // oczekujemy { access_token: "..." }
}

export async function getTransactions(token: string) {
  const res = await fetch(`${API_URL}/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addTransaction(token: string, title: string, amount: number) {
  const res = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ title, amount }),
  });
  return res.json();
}


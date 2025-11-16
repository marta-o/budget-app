const API_URL =  "http://127.0.0.1:8000";

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
  return res.json();
}

async function handleRes(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.message || res.statusText);
  }
  return res.json().catch(() => ({}));
}

export async function getProfile(token: string) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleRes(res);
}

export async function getTransactions(token: string, filters?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') params.append(k, String(v));
    });
  }
  const url = `${API_URL}/transactions/` + (params.toString() ? `?${params.toString()}` : '');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleRes(res);
}

export async function addTransaction(token: string, tx: { title: string; amount: number; category_id?: number; type?: string; date?: string }) {
  const res = await fetch(`${API_URL}/transactions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(tx),
  });
  return handleRes(res);
}

export async function updateTransaction(token: string, id: string | number, tx: Partial<{ title: string; amount: number; category_id?: number; type?: string; date?: string }>) {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(tx),
  });
  return handleRes(res);
}

export async function deleteTransaction(token: string, id: string | number) {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleRes(res);
}

export async function getCategories(token?: string, type?: string) {
  const q = type ? `?type=${encodeURIComponent(type)}` : "";
  const headers: any = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/categories/${q}`, { headers });
  return handleRes(res);
}
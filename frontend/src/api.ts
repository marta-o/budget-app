/**
 * API client for communicating with the FastAPI backend.
 * All functions handle authentication via Bearer token.
 */

const API_URL = "http://127.0.0.1:8000";

/** Handle API response - throws error with detail message if not OK */
async function handleRes(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.message || res.statusText);
  }
  return res.json().catch(() => ({}));
}


// Auth endpoints

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
  return res.json();
}

export async function register(payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function getProfile(token: string) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleRes(res);
}


// Transaction endpoints

export async function getTransactions(
  token: string,
  filters?: Record<string, string | number | undefined>
) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") {
        params.append(k, String(v));
      }
    });
  }
  const url = `${API_URL}/transactions/${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleRes(res);
}

export async function addTransaction(
  token: string,
  tx: { title: string; amount: number; category_id?: number; date?: string }
) {
  const res = await fetch(`${API_URL}/transactions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(tx),
  });
  return handleRes(res);
}

export async function updateTransaction(
  token: string,
  id: string | number,
  tx: Partial<{ title: string; amount: number; category_id?: number; date?: string }>
) {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
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


// Category endpoints

export async function getCategories(token?: string, type?: string) {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_URL}/categories/${query}`, { headers });
  return handleRes(res);
}


// Prediction endpoints

/** Get spending forecast for all categories for a specific month and year (used by Planning component) */
export async function getForecastAll(token: string, month: number, year: number) {
  const query = `?month=${month}&year=${year}`;
  const res = await fetch(`${API_URL}/predictions/forecast-all${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleRes(res);
}

/** Get model metrics (accuracy, training info) - used by Planning component */
export async function getSpendingSummary(token: string) {
  const res = await fetch(`${API_URL}/predictions/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleRes(res);
}

/** Get feature importance from ML model */
export async function getFeatureImportance(token: string) {
  const res = await fetch(`${API_URL}/predictions/feature-importance`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleRes(res);
}
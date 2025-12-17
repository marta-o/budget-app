/**
 * Main application component.
 * Handles authentication state and renders LoginPage or Dashboard.
 */
import { useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { getCategories, getProfile } from "./api";


export interface Transaction {
  id: string;
  amount: number;
  category_id: number | null;
  category: string;
  category_type?: "income" | "expense";  // Type derived from category
  title: string;
  date: string;
}

export interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
}

/** Helper to get transaction type from category */
export function getTransactionType(
  tx: Transaction,
  categories: Category[]
): "income" | "expense" {
  if (tx.category_type) return tx.category_type;
  const cat = categories.find(c => c.id === tx.category_id);
  return cat?.type ?? "expense";
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  /** Fetch categories from API */
  const fetchCategories = async (accessToken: string) => {
    try {
      const data = await getCategories(accessToken);
      setCategories(data || []);
    } catch {
      setCategories([]);
    }
  };

  /** Restore session from sessionStorage on mount */
  useEffect(() => {
    const saved = sessionStorage.getItem("bm_token");
    if (!saved) return;

    (async () => {
      try {
        const profile = await getProfile(saved);
        setToken(saved);
        setUsername(profile.username);
        setIsLoggedIn(true);
        await fetchCategories(saved);
      } catch {
        sessionStorage.removeItem("bm_token");
        setToken(null);
        setIsLoggedIn(false);
      }
    })();
  }, []);

  const handleLogin = (accessToken: string, usernameValue: string) => {
    setToken(accessToken);
    setUsername(usernameValue);
    setIsLoggedIn(true);
    sessionStorage.setItem("bm_token", accessToken);
    fetchCategories(accessToken);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setToken(null);
    setCategories([]);
    sessionStorage.removeItem("bm_token");
  };

  if (!isLoggedIn || !token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      username={username}
      token={token}
      categories={categories}
      onLogout={handleLogout}
    />
  );
}

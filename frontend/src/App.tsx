import { useEffect, useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { getCategories, getProfile } from './api';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: number | null;
  category: string;
  title: string;
  date: string;
}

export interface Category {
  id: number;
  name: string;
  person_id?: number;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchCategories = async (accessToken: string) => {
    try {
      const data = await getCategories(accessToken);
      setCategories(data || []);
    } catch (err) {
      setCategories([]);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('bm_token');
    if (!saved) return;
    (async () => {
      try {
        const profile = await getProfile(saved);
        setToken(saved);
        setUsername(profile.username);
        setIsLoggedIn(true);
        await fetchCategories(saved);
      } catch {
        sessionStorage.removeItem('bm_token');
        setToken(null);
        setIsLoggedIn(false);
      }
    })();
  }, []);

  const handleLogin = (accessToken: string, usernameValue: string) => {
    setToken(accessToken);
    setUsername(usernameValue);
    setIsLoggedIn(true);
    sessionStorage.setItem('bm_token', accessToken); // store in sessionStorage
    fetchCategories(accessToken);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setToken(null);
    setCategories([]);
    sessionStorage.removeItem('bm_token'); // clear on logout
  };

  if (!isLoggedIn || !token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard username={username} token={token} categories={categories} onLogout={handleLogout} />;
}

// export default function App() {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [username, setUsername] = useState('');
//   const [token, setToken] = useState<string | null>(null);
//   const [categories, setCategories] = useState<Category[]>([]);

//   const handleLogin = (accessToken: string, username: string) => {
//     setToken(accessToken);
//     setUsername(username);
//     setIsLoggedIn(true);
//     localStorage.setItem('bm_token', accessToken);
//   };

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     setUsername('');
//     setToken(null);
//     localStorage.removeItem('bm_token');
//   };

//   if (!isLoggedIn) {
//     return <LoginPage onLogin={handleLogin} />;
//   }

//   return <Dashboard username={username} token={token!} onLogout={handleLogout} />;
// }
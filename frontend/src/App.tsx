import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const handleLogin = (accessToken: string, username: string) => {
    setToken(accessToken);
    setUsername(username);
    setIsLoggedIn(true);
    // opcjonalnie: zapisz token w localStorage
    localStorage.setItem('bm_token', accessToken);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setToken(null);
    localStorage.removeItem('bm_token');
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard username={username} token={token!} onLogout={handleLogout} />;
}
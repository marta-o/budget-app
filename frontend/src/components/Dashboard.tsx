import { useEffect, useState } from 'react';
import { getTransactions } from '../api';

interface DashboardProps {
  username: string;
  token: string;
  onLogout: () => void;
}

export function Dashboard({ username, token, onLogout }: DashboardProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchTx = async () => {
      setLoading(true);
      try {
        const res = await getTransactions(token);
        if (mounted) setTransactions(res || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTx();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Witaj, {username}</h1>
        <button onClick={onLogout} className="px-3 py-1 bg-red-500 text-white rounded">Wyloguj</button>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Transakcje</h2>
        {loading ? (
          <div>Ładowanie...</div>
        ) : transactions.length === 0 ? (
          <div>Brak transakcji</div>
        ) : (
          <ul className="space-y-2">
            {transactions.map((t: any) => (
              <li key={t.id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-sm text-muted-foreground">{t.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{t.amount}</div>
                    <div className="text-sm">{t.type}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
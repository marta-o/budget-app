/**
 * Dashboard - main view after login.
 * Displays monthly summary, transactions list, analytics, and planning tabs.
 */
import { useEffect, useState, useMemo } from "react";
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from "../api";
import { Wallet, LogOut, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { TransactionList } from "./TransactionList";
import { Analytics } from "./Analytics";
import { Planning } from "./Planning";
import { Transaction, Category, getTransactionType } from "../App";
import { Education } from "./Education";  


interface DashboardProps {
  username: string;
  token: string;
  categories: Category[];
  onLogout: () => void;
}

export function Dashboard({ username, token, categories, onLogout }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string[]>([]);
  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');
  const [q, setQ] = useState<string>('');

  const visibleCategories = useMemo(() => {
    if (filterType === 'all') return categories;
    return categories.filter(c => c.type === filterType);
  }, [categories, filterType]);

  useEffect(() => {
    if (filterCategoryId.length === 0) return;
    const valid = filterCategoryId.filter(id => visibleCategories.some(c => String(c.id) === id));
    if (valid.length !== filterCategoryId.length) setFilterCategoryId(valid);
  }, [filterType, visibleCategories, filterCategoryId]);

  useEffect(() => {
    let mounted = true;
    const fetchTx = async () => {
      setLoading(true);
      try {
        const filters: Record<string, string | number> = {};
        if (filterType && filterType !== 'all') filters.tx_type = filterType;
        if (filterCategoryId.length > 0) filters.category_id = filterCategoryId.join(',');
        if (filterStart) filters.start = filterStart;
        if (filterEnd) filters.end = filterEnd;
        if (q) filters.q = q;
        const res = await getTransactions(token, filters);
        if (mounted) setTransactions(res || []);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Błąd pobierania');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const id = setTimeout(() => {
      if (token) fetchTx();
    }, 250);

    return () => { mounted = false; clearTimeout(id); };
  }, [token, filterType, filterCategoryId, filterStart, filterEnd, q]);

  const currentDate = new Date();
  const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });
  }, [transactions, currentMonthStart, currentMonthEnd]);

  // Calculate totals using category type
  const totalIncome = currentMonthTransactions
    .filter(t => getTransactionType(t, categories) === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = currentMonthTransactions
    .filter(t => getTransactionType(t, categories) === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  const handleAdd = async (tx: Omit<Transaction, 'id'>) => {
    const tempId = `tmp-${Date.now()}`;
    const temp = { ...tx, id: tempId };
    setTransactions(prev => [temp, ...prev]);
    try {
      const created = await addTransaction(token, tx as any);
      if (created && created.id) setTransactions(prev => prev.map(t => t.id === tempId ? created : t));
    } catch (e: any) {
      setTransactions(prev => prev.filter(t => t.id !== tempId));
      setError(e?.message || 'Nie udało się dodać transakcji');
    }
  };

  const handleEdit = async (id: string, payload: Omit<Transaction, 'id'>) => {
    const backup = transactions;
    setTransactions(prev => prev.map(t => t.id === id ? { ...payload, id } : t));
    try {
      await updateTransaction(token, id, payload as any);
    } catch (e: any) {
      setTransactions(backup);
      setError(e?.message || 'Edycja nie powiodła się');
    }
  };

  const handleDelete = async (id: string) => {
    const backup = transactions;
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTransaction(token, id);
    } catch (e: any) {
      setTransactions(backup);
      setError(e?.message || 'Usuwanie nie powiodło się');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-black p-4 md:p-6" style={{ 
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}>
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: "#dec5feff" }}>
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-black">Menedżer Finansów</h1>
              <p className="text-black text-sm">{username}</p>
            </div>
          </div>
            <Button 
              variant="ghost" 
              className="border border-gray-500 text-black gap-2"
              style={{ backgroundColor: "#dec5feff", color: "#000000" }}
              onClick={onLogout} 
              aria-label="Wyloguj"
          >
  <LogOut className="w-4 h-4" /> Wyloguj
</Button>
        </div>

          <div className="rounded-2xl p-6 shadow-lg"
            style={{
             background: `linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0.7))`
             }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-black" />
              <h2 className="capitalize" style={{ color: "#000000ff" }}>{currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="flex flex-col items-center text-center rounded-xl border border-slate-200 !bg-white p-4 shadow-lg">
                <p className="text-slate-900 text-sm mb-1">Saldo miesiąca</p>
                <p className={`text-3xl ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balance.toFixed(2)} zł
                </p>
              </div>

              <div className="flex flex-col items-center text-center rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <p className="text-slate-900 text-sm mb-1">Przychody</p>
                <p className="text-3xl text-green-600">
                +{totalIncome.toFixed(2)} zł
                </p>
              </div>

              <div className="flex flex-col items-center text-center rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <p className="text-slate-900 text-sm mb-1">Wydatki</p>
                <p className="text-3xl text-red-600">
                -{totalExpenses.toFixed(2)} zł
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto" style={{ marginTop: "2rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
      <Tabs
        defaultValue="transactions"
        className="space-y-4"
        onValueChange={(v) => {
          if (v !== "transactions") {
            setFilterType("all");
            setFilterCategoryId([]);
            setFilterStart("");
            setFilterEnd("");
            setQ("");
          }
        }}
      >
        <TabsList
          className="grid w-full grid-cols-4 rounded-2xl p-1 !bg-[#C088E3] !text-black"
          style={{ backgroundColor: "#dec5feff" }} //kolor paska
        >
          <TabsTrigger value="transactions" className="!text-black">
            Transakcje
          </TabsTrigger>
          <TabsTrigger value="analytics" className="!text-black">
            Analityka
          </TabsTrigger>
          <TabsTrigger value="planning" className="!text-black">
            Planowanie
          </TabsTrigger>
          <TabsTrigger value="news" className="!text-black">
            Edukacja
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionList
            transactions={transactions}
            onDelete={handleDelete}
            onEdit={handleEdit}
            categories={categories}
            onAdd={handleAdd}
            q={q}
            setQ={setQ}
            onApplyFilters={({ type, categoryId, start, end }) => {
              setFilterType(type);
              setFilterCategoryId(categoryId);
              setFilterStart(start);
              setFilterEnd(end);
            }}
            onClearFilters={() => {
              setFilterType('all');
              setFilterCategoryId([]);
              setFilterStart('');
              setFilterEnd('');
              setQ('');
            }}
            currentFilters={{ type: filterType, categoryId: filterCategoryId, start: filterStart, end: filterEnd }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Analytics transactions={transactions} categories={categories} token={token} />
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Planning transactions={transactions} categories={categories} token={token} />
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <Education />
          </div>
        </TabsContent>
      </Tabs>
      </div>
 
      <div className="max-w-4xl mx-auto p-6">
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {loading ? <div>Ładowanie...</div> : null}
      </div>
    </div>
  );
}
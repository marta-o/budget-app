import { useEffect, useState, useMemo, useCallback } from 'react';
import { getTransactions , addTransaction, updateTransaction, deleteTransaction } from '../api';
import { Wallet, TrendingUp, TrendingDown, LogOut, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { TransactionList } from './TransactionList';
import { FilterTransactionDialog } from './FilterTransactionDialog';
import { AddTransactionDialog } from './AddTransactionDialog';
// import { SpendingChart } from './SpendingChart';
// import { CategoryBreakdown } from './CategoryBreakdown';
// import { YearlyChart } from './YearlyChart';
// import { PlanningPage } from './PlanningPage';
// import { NewsPage } from './NewsPage';
import { Transaction, Category } from '../App';

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
  
  // Filters 
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');
  const [q, setQ] = useState<string>('');

  // Dialog state
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  // When dialog opens, initialize temporary inputs from current filters
  useEffect(() => {
    // Dialog initialization moved to FilterTransactionDialog component
  }, [filterDialogOpen]);

  

  // visible categories depend on selected filterType
  const visibleCategories = useMemo(() => {
    if (filterType === 'all') return categories;
    return categories.filter(c => c.type === filterType);
  }, [categories, filterType]);

  // whether any filter is currently active (used to show a clear button)
  const filtersActive = useMemo(() => {
    return (
      filterType !== 'all' ||
      filterCategoryId !== '' ||
      filterStart !== '' ||
      filterEnd !== '' ||
      q !== ''
    );
  }, [filterType, filterCategoryId, filterStart, filterEnd, q]);

  // If selected category doesn't belong to the chosen type, reset to empty
  useEffect(() => {
    if (filterCategoryId === '') return;
    const exists = visibleCategories.some(c => String(c.id) === filterCategoryId);
    if (!exists) setFilterCategoryId('');
  }, [filterType, visibleCategories, filterCategoryId]);

  // Fetch transactions from server whenever token or filters change.
  useEffect(() => {
    let mounted = true;
    const fetchTx = async () => {
      setLoading(true);
      try {
        const filters: Record<string, string | number> = {};
        if (filterType && filterType !== 'all') filters.tx_type = filterType;
        if (filterCategoryId) filters.category_id = filterCategoryId;
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
    }, 250); // debounce for quick filter changes

    return () => { mounted = false; clearTimeout(id); };
  }, [token, filterType, filterCategoryId, filterStart, filterEnd, q]);

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });
  }, [transactions, currentMonthStart, currentMonthEnd]);

  const totalIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Górny wiersz: ikonka + tytuł + wyloguj */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-white">Menedżer Finansów</h1>
              <p className="text-blue-100 text-sm">{username}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/20 gap-2"
            onClick={onLogout}
            aria-label="Wyloguj"
          >
            <LogOut className="w-4 h-4" />
            Wyloguj
          </Button>
        </div>

        {/* Box z miesiącem – niżej, z odstępem dzięki gap-6 */}
        <div className="bg-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" />
            <h2 className="text-white capitalize">{currentMonth}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-blue-100 text-sm mb-1">Saldo miesiąca</p>
              <p className={`text-3xl ${balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {balance.toFixed(2)} zł
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Przychody</p>
              <p className="text-3xl text-green-300">
                +{totalIncome.toFixed(2)} zł
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Wydatki</p>
              <p className="text-3xl text-red-300">
                -{totalExpenses.toFixed(2)} zł
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between items-start mb-4 gap-4">
          <h2 className="text-xl font-medium">Transakcje</h2>

          <div className="flex items-center gap-2 flex-wrap">
            <AddTransactionDialog onAdd={handleAdd} categories={categories} />
              <FilterTransactionDialog
                open={filterDialogOpen}
                onOpenChange={setFilterDialogOpen}
                initial={{ type: filterType, categoryId: filterCategoryId, start: filterStart, end: filterEnd }}
                categories={categories}
                onApply={(vals) => {
                  setFilterType(vals.type);
                  setFilterCategoryId(vals.categoryId);
                  setFilterStart(vals.start);
                  setFilterEnd(vals.end);
                }}
              />

            {/* Main search button + optional inline input */}
            <div className="flex items-center gap-2">
              <Button className="p-2" onClick={() => setSearchVisible(prev => !prev)}>Szukaj</Button>
              {searchVisible && (
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Szukaj..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    className="p-2 rounded border"
                    onKeyDown={e => { if (e.key === 'Enter') {/* immediate search already applied via q */} }}
                  />
                </div>
              )}
            </div>
            {filtersActive && (
              <Button
                variant="default"
                className="h-10 rounded-full bg-gray-100 text-black px-4 transition-none hover:bg-gray-100 active:bg-gray-100 hover:text-black active:text-black shadow-sm focus:ring-0 focus:outline-none"
                onClick={() => { setFilterType('all'); setFilterCategoryId(''); setFilterStart(''); setFilterEnd(''); setQ(''); }}
              >
                Wyczyść filtry
              </Button>
            )}
          </div>
        </div>

        {error && <div className="text-red-600 mb-4">{error}</div>}
        {loading ? <div>Ładowanie...</div> : (
          <TransactionList transactions={transactions} onDelete={handleDelete} onEdit={handleEdit} categories={categories} />
        )}
      </div>
    </div>
  );
}
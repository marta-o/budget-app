import { useMemo, useState, useEffect } from "react";
import { Transaction, Category } from "../App";
import { getTransactions } from '../api';
import { CategoryBreakdown } from "./CategoryBreakdown";
import { YearlyChart } from "./YearlyChart";
import { Dropdown } from './ui/dropdown';
import { Button } from './ui/button';

interface AnalyticsProps {
  transactions: Transaction[];
  categories: Category[];
  token?: string;
}

export function Analytics({ transactions, categories, token }: AnalyticsProps) {
  const [allTransactions, setAllTransactions] = useState<Transaction[] | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!token) return;
    (async () => {
      try {
        const res = await getTransactions(token);
        if (mounted) setAllTransactions(res || []);
      } catch {
        if (mounted) setAllTransactions([]);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const sourceTransactions = token ? (allTransactions ?? transactions) : transactions;

  const years = useMemo(() => {
    const set = new Set<number>();
    sourceTransactions.forEach(t => set.add(new Date(t.date).getFullYear()));
    const arr = Array.from(set).sort((a, b) => b - a);
    if (arr.length === 0) arr.push(new Date().getFullYear());
    return arr;
  }, [sourceTransactions]);

  const [year, setYear] = useState<string>(""); // "" = wszystkie
  const [type, setType] = useState<'all'|'income'|'expense'>('all');
  const [categoryId, setCategoryId] = useState<string[]>([]);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  const visibleCategories = type === 'all' ? categories : categories.filter(c => c.type === type);

  useEffect(() => {
    if (categoryId.length === 0) return;
    const valid = categoryId.filter(id => visibleCategories.some(c => String(c.id) === id));
    if (valid.length !== categoryId.length) setCategoryId(valid);
  }, [type, categories]);

  const filteredTx = useMemo(() => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return sourceTransactions.filter(t => {
      if (type !== 'all' && t.type !== type) return false;
      if (categoryId.length > 0 && !categoryId.includes(String(t.category_id ?? ''))) return false;
      const d = new Date(t.date);
      if (s && d < s) return false;
      if (e && d > e) return false;
      if (year && String(d.getFullYear()) !== year) return false;
      return true;
    });
  }, [sourceTransactions, type, categoryId, start, end, year]);

  const totalIncome = filteredTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm">Rok</label>
              <div className="w-40">
                <Dropdown
                  value={year}
                  options={[{ value: '', label: 'Wszystkie' }, ...years.map(y => ({ value: String(y), label: String(y) }))]}
                  onChange={(v) => setYear(v as string)}
                />
              </div>
            </div>
          </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-md">
          <div className="flex items-center gap-2">
          <label className="text-sm">Typ</label>
          <div className="w-40">
            <Dropdown
              value={type}
              options={[{ value: 'all', label: 'Wszystkie' }, { value: 'income', label: 'Przychód' }, { value: 'expense', label: 'Wydatek' }]}
              onChange={(v) => setType(v as any)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Kategoria</label>
          <div className="w-48">
            <Dropdown
              multi
              value={categoryId}
              options={visibleCategories.map(c => ({ value: String(c.id), label: c.name }))}
              onChange={(v) => setCategoryId(Array.isArray(v) ? v : [])}
              placeholder="Wszystkie"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Od</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border border-slate-300 px-3 py-2 rounded-md bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Do</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border border-slate-300 px-3 py-2 rounded-md bg-white" />
        </div>

        <div>
          <Button variant="ghost" onClick={() => { setYear(''); setType('all'); setCategoryId([] as string[]); setStart(''); setEnd(''); }}>Wyczyść</Button>
        </div>
      </div>
      
      <div className="flex items-stretch gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm w-full">
          <p className="text-sm text-slate-500">Saldo (wybrane)</p>
          <p className="text-2xl font-semibold">{(totalIncome - totalExpense).toFixed(2)} zł</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm w-full">
          <p className="text-sm text-slate-500">Przychody (wybrane)</p>
          <p className="text-2xl text-green-600 font-semibold">+{totalIncome.toFixed(2)} zł</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm w-full">
          <p className="text-sm text-slate-500">Wydatki (wybrane)</p>
          <p className="text-2xl text-red-600 font-semibold">-{totalExpense.toFixed(2)} zł</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">Rozkład wydatków wg kategorii</h3>
          <CategoryBreakdown transactions={filteredTx} />
        </div>

        <div>
          <h3 className="font-medium mb-2">Przychody i wydatki</h3>
          <YearlyChart transactions={filteredTx} year={year ? Number(year) : undefined} />
        </div>
      </div>
    </div>
  );
}

export default Analytics;
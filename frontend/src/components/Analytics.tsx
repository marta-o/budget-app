import { useMemo, useState } from "react";
import { Transaction, Category } from "../App";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { YearlyChart } from "./YearlyChart";

interface AnalyticsProps {
  transactions: Transaction[];
  categories: Category[];
}

export function Analytics({ transactions, categories }: AnalyticsProps) {
  const years = useMemo(() => {
    const set = new Set<number>();
    transactions.forEach(t => set.add(new Date(t.date).getFullYear()));
    const arr = Array.from(set).sort((a, b) => b - a);
    if (arr.length === 0) arr.push(new Date().getFullYear());
    return arr;
  }, [transactions]);

  // filters
  const [year, setYear] = useState<string>(""); // "" = wszystkie
  const [type, setType] = useState<'all'|'income'|'expense'>('all');
  const [categoryId, setCategoryId] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  const visibleCategories = useMemo(() => {
    return type === 'all' ? categories : categories.filter(c => c.type === type);
  }, [categories, type]);

  const filteredTx = useMemo(() => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return transactions.filter(t => {
      if (type !== 'all' && t.type !== type) return false;
      if (categoryId && String(t.category_id ?? '') !== categoryId) return false;
      const d = new Date(t.date);
      if (s && d < s) return false;
      if (e && d > e) return false;
      if (year && String(d.getFullYear()) !== year) return false;
      return true;
    });
  }, [transactions, type, categoryId, start, end, year]);

  const totalIncome = filteredTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm">Rok</label>
          <select value={year} onChange={e => setYear(e.target.value)} className="border px-3 py-2 rounded">
            <option value=""></option>
            {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white/5 p-2 rounded-md">
        <div className="flex items-center gap-2">
          <label className="text-sm">Typ</label>
          <select value={type} onChange={e => setType(e.target.value as any)} className="border px-3 py-2 rounded">
            <option value="all">Wszystkie</option>
            <option value="income">Przychód</option>
            <option value="expense">Wydatek</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Kategoria</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="border px-3 py-2 rounded">
            <option value="">Wszystkie</option>
            {visibleCategories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Od</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border px-3 py-2 rounded" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Do</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border px-3 py-2 rounded" />
        </div>

        <div>
          <button onClick={() => { setYear(''); setType('all'); setCategoryId(''); setStart(''); setEnd(''); }} className="ml-2 px-3 py-2 rounded border bg-gray-100">Wyczyść</button>
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
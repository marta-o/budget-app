/**
 * Planning - Component for budget planning with transaction filtering.
 */
import { useMemo, useState, useEffect } from "react";
import { Transaction, Category, getTransactionType } from "../App";
import { getTransactions } from "../api";
import { Dropdown } from "./ui/dropdown";
import { Button } from "./ui/button";

interface PlanningProps {
  transactions: Transaction[];
  categories: Category[];
  token?: string;
}

export function Planning({ transactions, categories, token }: PlanningProps) {
  // Filter state
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [categoryId, setCategoryId] = useState<string[]>([]);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  // Fetch all transactions for planning
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
    return () => {
      mounted = false;
    };
  }, [token]);

  // Use fetched transactions if available
  const sourceTransactions = token ? (allTransactions ?? transactions) : transactions;

  // Extract unique years from transactions for year filter dropdown
  const years = useMemo(() => {
    const set = new Set<number>();
    sourceTransactions.forEach((t) => set.add(new Date(t.date).getFullYear()));
    const arr = Array.from(set).sort((a, b) => b - a);
    if (arr.length === 0) arr.push(new Date().getFullYear());
    return arr;
  }, [sourceTransactions]);

  // Filter categories based on type filter
  const visibleCategories = type === "all" ? categories : categories.filter((c) => c.type === type);

  // Reset category selection when type filter changes
  useEffect(() => {
    if (categoryId.length === 0) return;
    const valid = categoryId.filter((id) => visibleCategories.some((c) => String(c.id) === id));
    if (valid.length !== categoryId.length) setCategoryId(valid);
  }, [type, categories]);

  // Filter transactions based on all selected filters.
  const filteredTx = useMemo(() => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return sourceTransactions.filter((t) => {
      if (type !== "all") {
        const txType = getTransactionType(t, categories);
        if (txType !== type) return false;
      }
      if (categoryId.length > 0 && !categoryId.includes(String(t.category_id ?? ""))) return false;
      const d = new Date(t.date);
      if (s && d < s) return false;
      if (e && d > e) return false;
      if (year && String(d.getFullYear()) !== year) return false;
      return true;
    });
  }, [sourceTransactions, type, categoryId, start, end, year, categories]);

  // Calculate totals using category-derived type
  const totalIncome = filteredTx
    .filter((t) => getTransactionType(t, categories) === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTx
    .filter((t) => getTransactionType(t, categories) === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2 p-4 rounded-2xl" style={{ backgroundColor: "#ffffffff", border: "2px solid #EEEEEE" }}>
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ fontWeight: 700 }}>Rok</label>
            <div className="w-40">
              <Dropdown
                value={year}
                options={[{ value: '', label: 'Wszystkie' }, ...years.map(y => ({ value: String(y), label: String(y) }))]}
                onChange={(v) => setYear(v as string)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ fontWeight: 700 }}>Typ</label>
            <div className="w-40">
              <Dropdown
                value={type}
                options={[
                  { value: 'all', label: 'Wszystkie' },
                  { value: 'income', label: 'Przychód' },
                  { value: 'expense', label: 'Wydatek' }
                ]}
                onChange={(v) => setType(v as 'all' | 'income' | 'expense')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ fontWeight: 700 }}>Kategoria</label>
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
            <label className="text-sm" style={{ fontWeight: 700 }}>Od</label>
            <input
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="border border-slate-300 px-3 py-2 rounded-md bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ fontWeight: 700 }}>Do</label>
            <input
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="border border-slate-300 px-3 py-2 rounded-md bg-white"
            />
          </div>

          <div>
            <Button
              onClick={() => {
                setYear(String(new Date().getFullYear()));
                setType('all');
                setCategoryId([]);
                setStart('');
                setEnd('');
              }}
              style={{ backgroundColor: "#ffffff", color: "#000000" }}
            >
              Wyczyść
            </Button>
          </div>
        </div>
      </div>
      
    </div>
  );
}

export default Planning;
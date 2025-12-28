/**
 * Planning - Component for budget planning with transaction filtering.
 */
import { useMemo, useState, useEffect } from "react";
import { Transaction, Category, getTransactionType } from "../App";
import { getTransactions } from "../api";
import { Dropdown } from "./ui/dropdown";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/calendarview";

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

  // Month formatter for labels
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat("pl-PL", { month: "long" }),
    []
  );

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

  // Last three months based on current date
  const lastThreeMonths = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 3 }).map((_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - idx, 1);
      const labelRaw = monthFormatter.format(date);
      const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);
      return {
        month: date.getMonth(),
        year: date.getFullYear(),
        label,
      };
    });
  }, [monthFormatter]);

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

  // Monthly summaries for last three months
  const monthlySummaries = useMemo(() => {
    return lastThreeMonths.map(({ month, year: y, label }) => {
      const txInMonth = filteredTx.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() === month;
      });
      const income = txInMonth
        .filter((t) => getTransactionType(t, categories) === "income")
        .reduce((s, t) => s + t.amount, 0);
      const expense = txInMonth
        .filter((t) => getTransactionType(t, categories) === "expense")
        .reduce((s, t) => s + t.amount, 0);
      return {
        label,
        income,
        expense,
        balance: income - expense,
      };
    });
  }, [filteredTx, lastThreeMonths, categories]);

  // Calculate totals using category-derived type
  const totalIncome = filteredTx
    .filter((t) => getTransactionType(t, categories) === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTx
    .filter((t) => getTransactionType(t, categories) === "expense")
    .reduce((s, t) => s + t.amount, 0);

  // Budget usage for current month
  const currentMonthUsage = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const currentMonthTransactions = sourceTransactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const spent = currentMonthTransactions
      .filter((t) => getTransactionType(t, categories) === "expense")
      .reduce((s, t) => s + t.amount, 0);

    // Calculate predicted budget as average of last 3 months (placeholder)
    const lastThreeMonthsExpenses = lastThreeMonths.map(({ month, year: y }) => {
      const txInMonth = sourceTransactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() === month;
      });
      return txInMonth
        .filter((t) => getTransactionType(t, categories) === "expense")
        .reduce((s, t) => s + t.amount, 0);
    });

    const avgExpense = lastThreeMonthsExpenses.length > 0
      ? lastThreeMonthsExpenses.reduce((sum, val) => sum + val, 0) / lastThreeMonthsExpenses.length
      : 1000; // Fallback if no data

    const predicted = avgExpense > 0 ? avgExpense : 1000;
    const percentage = predicted > 0 ? Math.min((spent / predicted) * 100, 100) : 0;

    return { spent, predicted, percentage };
  }, [sourceTransactions, categories, lastThreeMonths]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2 p-4 rounded-2xl" style={{ backgroundColor: "#dec5feff", border: "2px solid #EEEEEE" }}>
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
            <DatePicker value={start} onChange={setStart} placeholder="Wybierz datę" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ fontWeight: 700 }}>Do</label>
            <DatePicker value={end} onChange={setEnd} placeholder="Wybierz datę" />
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

      {/* Budget Usage Card */}
      <div className="rounded-2xl shadow-lg p-6 border-2 border-[#EEEEEE]" style={{ backgroundColor: "#ffffffff" }}>
        <h3 className="text-xl font-bold text-[#6c4dd4] mb-2">
          Wykorzystanie Budżetu - Bieżący Miesiąc
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Wydane {currentMonthUsage.spent.toFixed(2)} zł z przewidywanych {currentMonthUsage.predicted.toFixed(2)} zł
        </p>
        
        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-6 overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${currentMonthUsage.percentage}%`,
              background: 'linear-gradient(to right, #dec5feff, #B983FF)'
            }}
          />
        </div>
        <p className="text-sm text-slate-700">
          {currentMonthUsage.percentage.toFixed(1)}% budżetu wykorzystane
        </p>
      </div>

      {/* Comparison of last 3 months */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]" style={{ backgroundColor: "#ffffffff" }}>
        <h3 className="text-lg font-semibold text-[#7450d4] mb-4">Porównanie Ostatnich 3 Miesięcy</h3>
        <div className="space-y-3">
          {monthlySummaries.map((m) => (
            <div
              key={m.label}
              className="flex flex-col gap-1 rounded-xl px-4 py-3 border border-[#EEEEEE]"
              style={{ backgroundColor: "#ffffffff", borderLeft: "6px solid #dec5feff", paddingLeft: "12px" }}
            >
              <div className="flex items-center justify-between text-base font-semibold text-[#5b4bb7]">
                <span>{m.label}</span>
              </div>
              <div className="flex justify-between gap-6 text-sm text-[#4b5563]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[#6c4dd4]">Przychody</span>
                  <span className="text-[#3b82f6]">+{m.income.toFixed(2)} zł</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[#6c4dd4]">Wydatki</span>
                  <span className="text-[#94A3B8]">-{m.expense.toFixed(2)} zł</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[#6c4dd4]">Saldo</span>
                  <span className="text-[#6c4dd4]">{m.balance.toFixed(2)} zł</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Predictions by category */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]" style={{ backgroundColor: "#ffffffff" }}>
        <h3 className="text-lg font-semibold text-[#B983FF] mb-1">Przewidywania Według Kategorii</h3>
        <p className="text-sm text-slate-600 mb-4">Średnie wydatki w kategoriach</p>
        <div className="space-y-2">
          {/* Placeholder categories */}
          {[
            { name: "Czynsz", amount: "400.00 zł", trend: "malejący" },
            { name: "Zakupy spożywcze", amount: "60.17 zł", trend: "malejący" },
            { name: "Rozrywka", amount: "40.00 zł", trend: "malejący" },
            { name: "Media", amount: "21.67 zł", trend: "malejący" },
            { name: "Transport", amount: "15.00 zł", trend: "malejący" },
            { name: "Zdrowie", amount: "20.00 zł", trend: "malejący" },
            { name: "Zakupy", amount: "100.00 zł", trend: "rosnący" },
            { name: "Inne wydatki", amount: "58.00 zł", trend: "malejący" }
          ].map((cat) => (
            <div
              key={cat.name}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition"
              style={{ backgroundColor: "#ffffffff", border: "2.5px solid #dec5feff" }}
            >
              <div>
                <p className="font-semibold text-[#B983FF]">{cat.name}</p>
                <p className="text-xs text-slate-600">Trend: {cat.trend}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#B983FF]">{cat.amount}</p>
                <p className="text-xs text-slate-600">średnio/miesiąc</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}

export default Planning;
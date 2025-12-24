/**
 * Planning - Component for budget planning with transaction filtering and predictions.
 */
import { useMemo, useState, useEffect } from "react";
import { Transaction, Category, getTransactionType } from "../App";
import { getTransactions, getForecastAll } from "../api";
import { Dropdown } from "./ui/dropdown";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/calendarview";

interface PlanningProps {
  transactions: Transaction[];
  categories: Category[];
  token?: string;
}

interface Prediction {
  category_id: number;
  category: string;
  estimated_amount: number;
  has_data: boolean;
  confidence: string;
  method: string;
  is_ml: boolean;
}

interface ForecastResponse {
  user_id: number;
  month: number;
  month_name: string;
  predictions: Prediction[];
  total_estimated: number;
  categories_with_data: number;
  categories_with_ml: number;
  total_categories: number;
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

  // Predictions state
  const [predictions, setPredictions] = useState<ForecastResponse | null>(null);
  const [predictionMonth, setPredictionMonth] = useState<number>(new Date().getMonth() + 1);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Month formatter for labels
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat("pl-PL", { month: "long" }),
    []
  );

  // Fetch transactions
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

  // Fetch predictions when month changes
  useEffect(() => {
    let mounted = true;
    if (!token) return;
    
    setLoadingPredictions(true);
    (async () => {
      try {
        const res = await getForecastAll(token, predictionMonth);
        if (mounted) setPredictions(res);
      } catch (err) {
        console.error("Failed to load predictions:", err);
        if (mounted) setPredictions(null);
      } finally {
        if (mounted) setLoadingPredictions(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, predictionMonth]);

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

      {/* Comparison of last 3 months */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]">
        <h3 className="text-lg font-semibold text-[#7450d4] mb-4">Porównanie Ostatnich 3 Miesięcy</h3>
        <div className="space-y-3">
          {monthlySummaries.map((m) => (
            <div
              key={m.label}
              className="flex flex-col gap-1 rounded-xl px-4 py-3"
              style={{ backgroundColor: "#ffffffff", borderLeft: "6px solid #dec5feff" }}
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
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#B983FF]">Prognoza Wydatków (ML)</h3>
            <p className="text-sm text-slate-600">
              {predictions?.categories_with_ml 
                ? `🤖 ${predictions.categories_with_ml} kategorii z modelem ML`
                : predictions?.categories_with_data 
                  ? `${predictions.categories_with_data} kategorii z danymi statystycznymi`
                  : "Brak historii transakcji"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Miesiąc:</label>
            <select
              value={predictionMonth}
              onChange={(e) => setPredictionMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-[#dec5fe] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B983FF]"
            >
              {["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", 
                "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
              ].map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total estimate */}
        {predictions && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#B983FF] to-[#7c3aed] text-white">
            <p className="text-sm opacity-90">Suma przewidywanych wydatków na {predictions.month_name}</p>
            <p className="text-2xl font-bold">{predictions.total_estimated.toFixed(2)} zł</p>
          </div>
        )}

        {/* Loading state */}
        {loadingPredictions && (
          <div className="text-center py-8 text-slate-500">Ładowanie predykcji...</div>
        )}

        {/* Predictions list */}
        {!loadingPredictions && predictions && (
          <div className="space-y-2">
            {predictions.predictions.map((pred) => (
              <div
                key={pred.category_id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition"
                style={{ backgroundColor: "#ffffffff", border: "2px solid #dec5feff" }}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#B983FF]">{pred.category}</p>
                      {pred.is_ml ? (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          🤖 ML
                        </span>
                      ) : pred.has_data ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          📊 Statystyka
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {pred.has_data ? (
                        <>
                          {pred.confidence === "wysoka" ? "wysoka pewność" : 
                           pred.confidence === "średnia" ? "średnia pewność" : 
                           pred.confidence === "niska" ? "niska pewność" : ""}
                          {pred.method && ` · ${pred.method === "random_forest" ? "Random Forest" : 
                            pred.method === "monthly_average" ? "średnia miesięczna" : 
                            pred.method === "category_average" ? "średnia kategorii" : pred.method}`}
                        </>
                      ) : (
                        <span className="text-slate-400">Brak danych historycznych</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-[#B983FF]">{pred.estimated_amount.toFixed(2)} zł</p>
                  <p className="text-xs text-slate-500">prognoza</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No predictions fallback */}
        {!loadingPredictions && !predictions && (
          <div className="text-center py-8 text-slate-500">
            Nie udało się załadować predykcji
          </div>
        )}
      </div>
      
    </div>
  );
}

export default Planning;
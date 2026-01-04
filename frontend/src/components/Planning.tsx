/**
 * Planning - Component for budget planning with transaction filtering and predictions.
 */
import { useMemo, useState, useEffect } from "react";
import { Transaction, Category, getTransactionType } from "../App";
import { getTransactions, getForecastAll, getFeatureImportance, getSpendingSummary } from "../api";

interface PlanningProps {
  transactions: Transaction[];
  categories: Category[];
  token?: string;
}

interface Prediction {
  category_id: number;
  category: string;
  estimated_amount: number;
  actual_amount?: number | null;
  has_data: boolean;
  confidence: string;
  method: string;
  is_ml: boolean;
  // Trend info
  trend_direction?: "up" | "down" | "stable" | "none" | "insufficient_data";
  trend_percent?: number | null;
  monthly_average?: number;
}

interface ForecastResponse {
  user_id: number;
  month: number;
  year: number;
  is_current_month?: boolean;
  is_past_month?: boolean;
  predictions: Prediction[];
  total_estimated: number;
  total_actual?: number | null;
  categories_with_data: number;
  categories_with_ml: number;
  total_categories: number;
}

const MONTH_NAMES = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", 
                      "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

// Generic async fetch hook to eliminate useEffect boilerplate
function useFetch<T>(
  token: string | undefined,
  fetchFn: (token: string) => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    
    (async () => {
      try {
        const result = await fetchFn(token);
        if (mounted) setData(result);
      } catch (err) {
        console.error("Fetch error:", err);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [token, ...deps]);

  return { data, loading };
}

// Helper function: Get CSS color class based on spending volatility level
function getVolatilityColor(volatility: string): string {
  switch (volatility) {
    case 'stabilne': return 'text-emerald-600';
    case 'zmienne': return 'text-orange-600';
    case 'mocno_zmienne': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

// Helper function: Format volatility level with visual symbol and text
function formatVolatility(volatility: string): string {
  switch (volatility) {
    case 'stabilne': return '◆ Stabilne';
    case 'zmienne': return '◇ Zmienne';
    case 'mocno_zmienne': return '◇ Mocno zmienne';
    default: return 'Nieznane';
  }
}

export function Planning({ transactions, categories, token }: PlanningProps) {
  // Fetch all transactions for analysis
  const { data: allTransactions } = useFetch(
    token,
    (token) => getTransactions(token),
    []
  );

  // Fetch ML model feature importance
  const { data: featureImportance, loading: loadingFeatures } = useFetch(
    token,
    async (token) => {
      const res = await getFeatureImportance(token);
      if (!res.importance || Object.keys(res.importance).length === 0) return null;
      return Object.entries(res.importance)
        .map(([name, value]) => ({ name, importance: value as number }))
        .sort((a, b) => b.importance - a.importance);
    },
    []
  );

  // Fetch ML model metrics (quality indicators)
  const { data: modelMetrics, loading: loadingMetrics } = useFetch(
    token,
    async (token) => {
      const res = await getSpendingSummary(token);
      return res.model_metrics || null;
    },
    []
  );

  // Current/future month predictions need manual state (depend on selectedPeriod)
  const [currentMonthPredictions, setCurrentMonthPredictions] = useState<ForecastResponse | null>(null);
  const [loadingCurrentMonth, setLoadingCurrentMonth] = useState(false);
  const [predictions, setPredictions] = useState<ForecastResponse | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Generate next 12 months for forecast selection
  const futureMonths = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return Array.from({ length: 12 }).map((_, idx) => {
      const monthIdx = (currentMonth + 1 + idx) % 12;
      const yearOffset = Math.floor((currentMonth + 1 + idx) / 12);
      const yr = currentYear + yearOffset;
      return {
        value: `${monthIdx + 1}-${yr}`,
        label: `${MONTH_NAMES[monthIdx]} ${yr}`,
        month: monthIdx + 1,
        year: yr
      };
    });
  }, []);

  // Current month label and date info for display and API calls
  const currentMonthInfo = useMemo(() => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
    };
  }, []);
  
  // Selected forecast period from dropdown
  const [selectedPeriod, setSelectedPeriod] = useState<string>(futureMonths[0]?.value || "");
  
  // Parse selected period to extract month and year numbers
  const predictionMonth = useMemo(() => {
    const [m] = selectedPeriod.split("-");
    return Number(m) || new Date().getMonth() + 1;
  }, [selectedPeriod]);
  
  const predictionYear = useMemo(() => {
    const [, y] = selectedPeriod.split("-");
    return Number(y) || new Date().getFullYear();
  }, [selectedPeriod]);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat("pl-PL", { month: "long" }),
    []
  );

  // Fetch current month predictions (with actual spending comparison)
  useEffect(() => {
    let mounted = true;
    if (!token) return;
    
    setLoadingCurrentMonth(true);
    (async () => {
      try {
        const res = await getForecastAll(token, currentMonthInfo.month, currentMonthInfo.year);
        if (mounted) setCurrentMonthPredictions(res);
      } catch (err) {
        console.error("Failed to load current month predictions:", err);
        if (mounted) setCurrentMonthPredictions(null);
      } finally {
        if (mounted) setLoadingCurrentMonth(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, currentMonthInfo.month, currentMonthInfo.year]);

  // Fetch future month predictions based on selected period
  useEffect(() => {
    let mounted = true;
    if (!token) return;
    
    setLoadingPredictions(true);
    (async () => {
      try {
        const res = await getForecastAll(token, predictionMonth, predictionYear);
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
  }, [token, predictionMonth, predictionYear]);

  // Use fetched transactions if available
  const sourceTransactions = token ? (allTransactions ?? transactions) : transactions;

  // Last 6 months of expenses (most recent first) for comparison card
  const lastSixMonths = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 1 - idx, 1);
      const labelRaw = monthFormatter.format(date);
      const shortLabel = labelRaw.slice(0, 3);
      return {
        month: date.getMonth(),
        year: date.getFullYear(),
        label: `${shortLabel} ${date.getFullYear()}`,
        fullLabel: `${labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1)} ${date.getFullYear()}`,
      };
    });
  }, [monthFormatter]);

  // Stable expense category list (sorted alphabetically, 'Other' last)
  const expenseCategoriesOrdered = useMemo(() => {
    return categories
      .filter((c) => c.type === "expense")
      .slice()
      .sort((a, b) => {
        if (a.name === 'Inne wydatki') return 1;
        if (b.name === 'Inne wydatki') return -1;
        return a.name.localeCompare(b.name);
      });
  }, [categories]);

  // Helper: calculate spending volatility (CV = coefficient of variation)
  // Returns: 'stabilne' (CV < 0.3), 'zmienne' (0.3-0.7), 'mocno_zmienne' (≥ 0.7)
  const getVolatility = (amounts: number[]): { volatility: string; cv: number } => {
    if (amounts.length < 2) return { volatility: 'mało_danych', cv: 0 };
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (mean === 0) return { volatility: 'brak_wydatków', cv: 0 };
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    const std = Math.sqrt(variance);
    const cv = std / mean;
    
    if (cv < 0.3) return { volatility: 'stabilne', cv };
    if (cv < 0.7) return { volatility: 'zmienne', cv };
    return { volatility: 'mocno_zmienne', cv };
  };

  const filteredTx = sourceTransactions;

  // Calculate monthly summaries: last 6 months with trend indicators, 12-month averages
  const monthlySummaries = useMemo(() => {
    // Build aggregation: year-month -> total expenses
    const monthlyMap = new Map<string, number>();
    const monthlyCategoryMap = new Map<string, Map<number, number>>();
    filteredTx.forEach((t: Transaction) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (getTransactionType(t, categories) === "expense") {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + t.amount);
        const catMap = monthlyCategoryMap.get(key) || new Map<number, number>();
        const catId = Number(t.category_id || 0);
        catMap.set(catId, (catMap.get(catId) || 0) + t.amount);
        monthlyCategoryMap.set(key, catMap);
      }
    });

    const months = lastSixMonths.map(({ month, year, label, fullLabel }) => {
      const key = `${year}-${month}`;
      const expense = Number((monthlyMap.get(key) || 0).toFixed(2));
      const catMap = monthlyCategoryMap.get(key) || new Map<number, number>();
      // build category totals (only non-zero to reduce clutter)
      const categoryTotals = expenseCategoriesOrdered
        .map((c) => ({ id: c.id, name: c.name, amount: Number((catMap.get(Number(c.id)) || 0).toFixed(2)) }))
        .filter((ct) => ct.amount > 0);
      return { month, year, label, fullLabel, expense, categoryTotals };
    });

    // Build 12-month list (previous 12 months starting from previous month)
    const lastTwelveMonths = Array.from({ length: 12 }).map((_, idx) => {
      const d = new Date();
      const date = new Date(d.getFullYear(), d.getMonth() - 1 - idx, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const expense = Number((monthlyMap.get(key) || 0).toFixed(2));
      return { month: date.getMonth(), year: date.getFullYear(), expense, key };
    });

    const avg12 = lastTwelveMonths.reduce((s, m) => s + m.expense, 0) / Math.max(1, lastTwelveMonths.length);

    // Compute per-category 12M averages and volatility
    const perCategorySum = new Map<number, number>();
    const perCategoryValues = new Map<number, number[]>(); // Track all values for volatility
    lastTwelveMonths.forEach((m) => {
      const catMap = monthlyCategoryMap.get(m.key) || new Map<number, number>();
      catMap.forEach((amt, catId) => {
        perCategorySum.set(catId, (perCategorySum.get(catId) || 0) + amt);
        const values = perCategoryValues.get(catId) || [];
        values.push(amt);
        perCategoryValues.set(catId, values);
      });
    });
    const perCategoryAvg12 = new Map<number, number>();
    const perCategoryVolatility = new Map<number, { volatility: string; cv: number }>();
    perCategorySum.forEach((sum, catId) => {
      perCategoryAvg12.set(catId, Number((sum / 12).toFixed(2)));
      const values = perCategoryValues.get(catId) || [];
      perCategoryVolatility.set(catId, getVolatility(values));
    });

    // Determine direction per month compared to 12M average (threshold 5%)
    const withDirection = months.map((m) => {
      let direction: "up" | "down" | "stable" = "stable";
      if (avg12 > 0) {
        const change = ((m.expense - avg12) / avg12) * 100;
        direction = change > 5 ? "up" : change < -5 ? "down" : "stable";
      }
      // augment categoryTotals with per-category 12M avg, direction and volatility
      const categoryTotals = m.categoryTotals.map((ct) => {
        const avgCat = perCategoryAvg12.get(Number(ct.id)) || 0;
        const volatilityInfo = perCategoryVolatility.get(Number(ct.id)) || { volatility: 'mało_danych', cv: 0 };
        let dir: "up" | "down" | "stable" = "stable";
        if (avgCat > 0) {
          const changeCat = ((ct.amount - avgCat) / avgCat) * 100;
          dir = changeCat > 5 ? "up" : changeCat < -5 ? "down" : "stable";
        }
        return { ...ct, avg12: avgCat, direction: dir, volatility: volatilityInfo.volatility, cv: volatilityInfo.cv };
      });

      return { ...m, direction, categoryTotals };
    });

    return { months: withDirection, avg12, perCategoryAvg12, perCategoryVolatility };
  }, [filteredTx, lastSixMonths, expenseCategoriesOrdered]);

  return (
    <div className="space-y-4">

      {/* Comparison + Current month side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Comparison of last 12 months (compact) */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[#7450d4]">Porównanie wydatków  względem średniej z ostatnich 12 miesięcy</h3>
        </div>
        <div className="text-xs text-slate-600 mb-3">
          <div className="mb-2">
            <div className="font-medium text-slate-700">Średnia (ostatnie 12 miesięcy): <span className="font-semibold">{monthlySummaries.avg12.toFixed(2)} zł</span></div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {expenseCategoriesOrdered.map((c) => {
                const catId = Number(c.id);
                const volatilityInfo = monthlySummaries.perCategoryVolatility?.get(catId) || { volatility: 'mało_danych', cv: 0 };
                return (
                  <div key={c.id} className="text-xs text-slate-600 flex justify-between items-center gap-2">
                    <div>{c.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{(monthlySummaries.perCategoryAvg12.get(catId) || 0).toFixed(2)} zł</div>
                      <div className={`text-xs ${getVolatilityColor(volatilityInfo.volatility)} font-medium`}>
                        {(volatilityInfo.volatility === 'mało_danych' || volatilityInfo.volatility === 'brak_wydatków') ? '◆ Mało danych' : formatVolatility(volatilityInfo.volatility)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {monthlySummaries.months.map((m) => (
            <details key={`${m.year}-${m.month}`} className="rounded-lg border mb-1 border-card-border-light">
              <summary className="flex items-center justify-between p-2 bg-white cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500">{m.fullLabel}</div>
                  <div className="text-sm font-medium text-slate-700">{m.expense.toFixed(0)} zł</div>
                </div>
                <div>
                  {m.direction === 'up' ? (
                    <span className="text-red-600 font-bold text-lg">↑</span>
                  ) : m.direction === 'down' ? (
                    <span className="text-green-600 font-bold text-lg">↓</span>
                  ) : (
                    <span className="text-slate-500 font-bold text-lg">→</span>
                  )}
                </div>
              </summary>
              <div className="p-2 bg-white">
                {m.categoryTotals && m.categoryTotals.length > 0 ? (
                  <div className="space-y-1">
                    {m.categoryTotals.map((ct) => (
                      <div key={ct.id} className="flex justify-between items-center text-xs text-slate-600 px-2 py-1">
                        <div>{ct.name}</div>
                        <div className="text-right flex items-center gap-2">
                          <div className="font-medium">{ct.amount.toFixed(2)} zł</div>
                          <div className={`${
                              ct.direction === 'up' ? 'text-red-600 font-bold text-lg' :
                              ct.direction === 'down' ? 'text-green-600 font-bold text-lg' :
                              'text-slate-500 font-bold text-lg'
                            }`}>
                            {ct.direction === 'up' ? '↑' : ct.direction === 'down' ? '↓' : '→'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 px-2">Brak wydatków w tym miesiącu</div>
                )}
              </div>
            </details>
          ))}
        </div>
       <div className="text-xs text-slate-600 mb-3">
        <div className="flex flex-col gap-3 mt-3">
          <div>
            <div className="font-semibold text-slate-700 mb-2">Trend (porównanie do średniej 12 miesięcy):</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold text-lg">↑</span>
                <span>Rosnące — większe niż +5% względem średniej</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold text-lg">↓</span>
                <span>Malejące — mniejsze niż -5% względem średniej</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold text-lg">→</span>
                <span>Stabilne — mieszczą się w ±5% od średniej</span>
              </div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-slate-700 mb-2">Zmienność (nieprzewidywalność wydatków):</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">◆</span>
                <span>Stabilne — wydatki mało się zmieniają</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-orange-600">◆</span>
                <span>Zmienne — wydatki się wahają</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">◆</span>
                <span>Mocno zmienne — wydatki nieprzewidywalne</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* CURRENT MONTH - Predictions vs Actual */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#10b981]">Aktualny miesiąc: {currentMonthInfo.label}</h3>
          <p className="text-sm text-slate-600">Porównanie predykcji z rzeczywistymi wydatkami</p>
        </div>

        {/* Summary bar */}
        {currentMonthPredictions && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-black">
            <div className="flex justify-between items-center">
              <div>
  
                <p className="text-sm opacity-90">Prognoza</p>
                <p className="text-xl font-bold">{currentMonthPredictions.total_estimated.toFixed(2)} zł</p>
              </div>
              <div className="text-center px-4">
                <p className="text-sm opacity-90">vs</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Wydano dotąd</p>
                <p className="text-xl font-bold">{(currentMonthPredictions.total_actual ?? 0).toFixed(2)} zł</p>
              </div>
              <div className="text-right ml-4 pl-4 border-l border-white/30">
                <p className="text-sm opacity-90">Różnica</p>
                <p className={`text-xl font-bold ${
                  (currentMonthPredictions.total_estimated - (currentMonthPredictions.total_actual ?? 0)) >= 0 
                    ? 'text-white' : 'text-yellow-200'
                }`}>
                  {(currentMonthPredictions.total_estimated - (currentMonthPredictions.total_actual ?? 0)).toFixed(2)} zł
                </p>
              </div>
            </div>
          </div>
        )}

        {loadingCurrentMonth && (
          <div className="text-center py-4 text-slate-500">Ładowanie...</div>
        )}

        {!loadingCurrentMonth && currentMonthPredictions && (
          <div className="space-y-2">
            {[...currentMonthPredictions.predictions]
              .filter((p) => p.has_data || (p.actual_amount && p.actual_amount > 0))
              .sort((a, b) => {
                const aName = expenseCategoriesOrdered.find((c) => c.id === a.category_id)?.name || a.category;
                const bName = expenseCategoriesOrdered.find((c) => c.id === b.category_id)?.name || b.category;
                const aIsOther = aName === 'Inne wydatki';
                const bIsOther = bName === 'Inne wydatki';
                if (aIsOther && !bIsOther) return 1;
                if (!aIsOther && bIsOther) return -1;
                return aName.localeCompare(bName);
              })
              .map((pred) => {
                const diff = pred.estimated_amount - (pred.actual_amount ?? 0);
                const pctUsed = pred.estimated_amount > 0 
                  ? ((pred.actual_amount ?? 0) / pred.estimated_amount) * 100
                  : 0;
                
                return (
                  <div
                    key={pred.category_id}
                    className="p-3 rounded-lg border bg-white hover:bg-slate-50 transition border-success-light"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{pred.category}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-slate-500">
                          Prognoza: <span className="font-medium text-success-border">{pred.estimated_amount.toFixed(2)} zł</span>
                        </span>
                        <span className="text-slate-500">
                          Wydano: <span className="font-medium text-slate-700">{(pred.actual_amount ?? 0).toFixed(2)} zł</span>
                        </span>
                        <span className={`font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {diff >= 0 ? '+' : ''}{diff.toFixed(2)} zł
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end mt-1">
                      <p className="text-xs text-slate-400 text-right">
                        {pctUsed.toFixed(0)}% wykorzystanego budżetu
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      </div>

      {/* FUTURE MONTHS - Predictions by category */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "#B983FF" }}>Prognoza Przyszłych Wydatków</h3>
            <p className="text-sm text-slate-600">
              {predictions?.categories_with_ml 
                ? `${predictions.categories_with_ml} kategorii z modelem ML`
                : predictions?.categories_with_data 
                  ? `${predictions.categories_with_data} kategorii z danymi statystycznymi`
                  : "Brak wystarczającej historii transakcji"}
            </p>
            <div className="mt-2 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-red-100 inline-block" />
                  <span>Rosnące — wydatki istotnie wyższe niż 12-miesięczna średnia (&gt;+5%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-green-100 inline-block" />
                  <span>Malejące — wydatki istotnie niższe niż 12-miesięczna średnia (&lt;-5%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-slate-100 inline-block" />
                  <span>Stabilne — mieszczą się w ±5% od 12-miesięcznej średniej</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Pojedynczy wybór okresu (miesiąc + rok) */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer py-1 px-2"
              >
                {futureMonths.map((period) => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Total estimate */}
        {predictions && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300">
            <p className="text-sm text-purple-700">Suma przewidywanych wydatków na {futureMonths.find(p => p.value === selectedPeriod)?.label}</p>
            <p className="text-2xl font-bold text-purple-900">{predictions.total_estimated.toFixed(2)} zł</p>
          </div>
        )}

        {/* Loading state */}
        {loadingPredictions && (
          <div className="text-center py-8 text-slate-500">Ładowanie predykcji...</div>
        )}

        {/* Predictions List */}
        {!loadingPredictions && predictions && (
          <div className="space-y-2">
            {[...predictions.predictions]
              .slice()
              .sort((a, b) => {
                const aName = expenseCategoriesOrdered.find((c) => c.id === a.category_id)?.name || a.category;
                const bName = expenseCategoriesOrdered.find((c) => c.id === b.category_id)?.name || b.category;
                const aIsOther = aName === 'Inne wydatki';
                const bIsOther = bName === 'Inne wydatki';
                if (aIsOther && !bIsOther) return 1;
                if (!aIsOther && bIsOther) return -1;
                return aName.localeCompare(bName);
              })
              .map((pred) => {
              return (
                <div
                  key={pred.category_id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition ${
                    !pred.has_data ? "opacity-60 bg-slate-50 border-dashed border-slate-200" : "hover:bg-slate-50 bg-white"
                  }`}
                  style={{ borderColor: pred.has_data ? "#dec5fe" : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{ color: pred.has_data ? "#B983FF" : undefined }}>
                          {pred.category}
                        </p>
                        
                        {/* status badges removed (cleaner UI) */}

                        {/* Trend badge - descriptive labels instead of arrows */}
                        {pred.trend_direction && pred.trend_direction !== "none" && pred.trend_direction !== "insufficient_data" && (
                          <span className={`text-[13px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold ${
                            pred.trend_direction === "up" ? "bg-red-100 text-red-700" :
                            pred.trend_direction === "down" ? "bg-green-100 text-green-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {pred.trend_direction === "up" ? "Rosnące" : pred.trend_direction === "down" ? "Malejące" : "Stabilne"}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-500 mt-1">
                        {pred.has_data ? (
                          <>
                            {pred.confidence === "high" ? "🟢 Wysoka pewność" : 
                             pred.confidence === "medium" ? "🟡 Średnia pewność" : 
                             "🔴 Niska pewność"}
                            {pred.monthly_average && pred.monthly_average > 0 && (
                              <span className="ml-2">• Śr. {pred.monthly_average.toFixed(0)} zł/mies.</span>
                            )}
                          </>
                        ) : (
                          "Za mało transakcji w historii"
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {pred.has_data ? (
                      <>
                        <p className="font-bold text-lg" style={{ color: "#B983FF" }}>{pred.estimated_amount.toFixed(2)} zł</p>
                        <p className="text-xs text-slate-500">prognoza</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-slate-400">--- zł</p>
                    )}
                  </div>
                </div>
              );
              })}
          </div>
        )}

        {/* No predictions fallback */}
        {!loadingPredictions && !predictions && (
          <div className="text-center py-8 text-slate-500">
            Nie udało się załadować predykcji
          </div>
        )}
      </div>

      {/* Model Analysis (collapsible) */}
      {modelMetrics && (
        <details className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]" >
          <summary className="cursor-pointer mb-4 list-none">
            <h3 className="text-lg font-semibold" style={{ color: "#B983FF" }}>Analiza Modelu ML</h3>
          </summary>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* MAE */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">Średni błąd (MAE)</p>
              <p className="text-2xl font-bold text-blue-700">{modelMetrics.mae.toFixed(2)} zł</p>
              <p className="text-xs text-blue-600 mt-1">Przeciętna odchyłka od rzeczywistości</p>
            </div>
            
            {/* R² */}
            <div className={`p-4 rounded-lg border ${
              modelMetrics.r2 >= 0.8 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' :
              modelMetrics.r2 >= 0.7 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200' :
              'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
            }`}>
              <p className={`text-xs mb-1 ${
                modelMetrics.r2 >= 0.8 ? 'text-green-600' :
                modelMetrics.r2 >= 0.7 ? 'text-yellow-600' :
                'text-orange-600'
              }`}>Dobrość dopasowania (R²)</p>
              <p className={`text-2xl font-bold ${
                modelMetrics.r2 >= 0.8 ? 'text-green-700' :
                modelMetrics.r2 >= 0.7 ? 'text-yellow-700' :
                'text-orange-700'
              }`}>{(modelMetrics.r2 * 100).toFixed(1)}%</p>
              <p className={`text-xs mt-1 ${
                modelMetrics.r2 >= 0.8 ? 'text-green-600' :
                modelMetrics.r2 >= 0.7 ? 'text-yellow-600' :
                'text-orange-600'
              }`}>
                {modelMetrics.r2 >= 0.8 ? 'Doskonale' :
                 modelMetrics.r2 >= 0.7 ? 'Dobrze' :
                 'Do poprawy'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Training samples */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Próbek treningowych</p>
              <p className="text-2xl font-bold text-slate-700">{modelMetrics.training_samples}</p>
              <p className="text-xs text-slate-600 mt-1">transakcji w historii</p>
            </div>
            
            {/* Training months */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Okres treningowy</p>
              <p className="text-2xl font-bold text-slate-700">{modelMetrics.training_months}</p>
              <p className="text-xs text-slate-600 mt-1">miesięcy danych</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-xs text-purple-700">
              <strong>Wyjaśnienie:</strong><br/>
              • <strong>MAE</strong> - Im mniej, tym lepiej (jednostka: złote)<br/>
              • <strong>R²</strong> - Procent wyjaśnionej wariancji (0-100%, im wyżej lepiej)<br/>
              • <strong>R² &gt; 80%</strong> = Model bardzo dobry<br/>
              • <strong>R² 70-80%</strong> = Model zadowalający<br/>
              • <strong>R² &lt; 70%</strong> = Potrzeba więcej danych
            </p>
          </div>
        </details>
      )}

      {/* Feature Importance (collapsible) */}
      {featureImportance && featureImportance.length > 0 && (
        <details className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]">
          <summary className="cursor-pointer mb-4 list-none">
            <h3 className="text-lg font-semibold" style={{ color: "#B983FF" }}>Ważność Cech w Modelu ML</h3>
            <p className="text-sm text-slate-600">Które czynniki mają największy wpływ na prognozy?</p>
          </summary>
          
          <div className="space-y-3">
            {featureImportance.map((feature) => {
              const percent = Math.round(feature.importance * 100);
              // Map feature names to Polish labels (must match backend predictor.py feature_names_pl)
              const featureNames: Record<string, string> = {
                'category_encoded': 'Kategoria',
                'month_num': 'Miesiąc',
                'lag_1': 'Wydatek 1 miesiąc temu',
                'lag_2': 'Wydatek 2 miesiące temu',
                'lag_3': 'Wydatek 3 miesiące temu',
                'pct_change': 'Zmiana procentowa',
                'cv': 'Zmienność wydatków'
              };
              
              const displayName = featureNames[feature.name] || feature.name;
              
              return (
                <div key={feature.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700">{displayName}</span>
                      <span className="text-sm font-bold" style={{ color: "#B983FF" }}>{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-400 to-violet-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>)}

      {loadingFeatures && (
        <div className="text-center py-8 text-slate-500">
          Ładowanie informacji o modelu...
        </div>
      )}

      {!loadingFeatures && !featureImportance && (
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-[#EEEEEE]">
          <p className="text-center text-slate-600">
            Model ML będzie dostępny po gromadzeniu większej ilości danych transakcji (minimum 30)
          </p>
        </div>
      )}
      
    </div>
  );
}

export default Planning;
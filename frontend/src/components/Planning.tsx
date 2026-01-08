/**
 * Planning - Component for budget planning with transaction filtering and predictions.
 */
import { useMemo, useState, useEffect } from "react";
import { Transaction, Category, getTransactionType } from "../App";
import { getTransactions, getForecastAll, getFeatureImportance, getSpendingSummary } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dropdown } from "./ui/dropdown";

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
    case 'niska': return '~ Niska';
    case 'średnia': return '≈ Średnia';
    case 'wysoka': return '≋ Wysoka';
    default: return 'Nieznane';
  }
}

export function Planning({ transactions, categories, token }: PlanningProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'current' | 'future'>('history');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
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

  const formatMonthLabel = (month: number, year: number) => `${MONTH_NAMES[month]} ${year}`;

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
    
    if (cv < 0.3) return { volatility: 'niska', cv };
    if (cv < 0.7) return { volatility: 'średnia', cv };
    return { volatility: 'wysoka', cv };
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

    // Determine highest and lowest month in the last 12 months
    const maxMonth = lastTwelveMonths.reduce((max, m) => (m.expense > (max?.expense ?? -Infinity) ? m : max), lastTwelveMonths[0] || null);
    const minMonth = lastTwelveMonths.reduce((min, m) => (m.expense < (min?.expense ?? Infinity) ? m : min), lastTwelveMonths[0] || null);

    // Last (previous) month totals for quick comparison
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    const prevKey = `${prev.getFullYear()}-${prev.getMonth()}`;
    const lastMonthTotal = Number((monthlyMap.get(prevKey) || 0).toFixed(2));
    const lastMonthCategoryTotals = monthlyCategoryMap.get(prevKey) || new Map<number, number>();

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

    return {
      months: withDirection,
      avg12,
      perCategoryAvg12,
      perCategoryVolatility,
      lastTwelveMonths,
      maxMonth,
      minMonth,
      lastMonthTotal,
      lastMonthCategoryTotals
    };
  }, [filteredTx, lastSixMonths, expenseCategoriesOrdered]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Planowanie budżetu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="inline-flex items-center rounded-full p-1 text-sm font-medium text-slate-600 gap-1" style={{  border: '2px solid #dec5fe' }}>
            {[
              { key: 'history' as const, label: 'Analiza historyczna' },
              { key: 'current' as const, label: 'Aktualny miesiąc' },
              { key: 'future' as const, label: 'Prognoza przyszłych wydatków' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full transition ${
                  activeTab === tab.key ? 'shadow-sm text-slate-900 bg-white' : 'text-slate-700'
                }`}
                style={activeTab === tab.key ? { backgroundColor: '#dec5fe', border: '2px solid #dec5fe' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Średnie wydatki z ostatnich 12 miesięcy</CardTitle>
              <p className="text-4xs text-slate-500 mt-1">Suma średniej wydatków z 12 miesięcy: <span className="font-semibold text-purple-700">{monthlySummaries.avg12.toFixed(2)} zł</span></p>
            </CardHeader>
            <CardContent>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-700">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-2">Kategoria</th>
                      <th className="text-left pb-2">Średnia 12 miesięcy</th>
                      <th className="text-left pb-2">Zmienność wydatków</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseCategoriesOrdered.map((c) => {
                      const catId = Number(c.id);
                      const avgCat = monthlySummaries.perCategoryAvg12.get(catId) || 0;
                      const volatilityInfo = monthlySummaries.perCategoryVolatility?.get(catId) || { volatility: 'mało_danych', cv: 0 };
                      return (
                        <tr key={c.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 font-medium text-slate-800">{c.name}</td>
                          <td className="py-2 text-left">{avgCat.toFixed(2)} zł</td>
                          <td className={`py-2 text-right-7 text-xs font-semibold ${getVolatilityColor(volatilityInfo.volatility)}`}>
                            {volatilityInfo.volatility === 'mało_danych' || volatilityInfo.volatility === 'brak_wydatków'
                              ? 'Brak danych'
                              : formatVolatility(volatilityInfo.volatility)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Przegląd miesięczny</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
              {monthlySummaries.maxMonth && monthlySummaries.minMonth && 
               monthlySummaries.maxMonth.month === monthlySummaries.minMonth.month && 
               monthlySummaries.maxMonth.year === monthlySummaries.minMonth.year ? (
                // Jeśli max i min to ten sam miesiąc, pokaż tylko jeden box
                <>
                <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderWidth: '3px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                  <p className="text-xs text-purple-600 mb-1">Jedyny miesiąc z danymi</p>
                  <p className="text-lg font-semibold text-slate-800">{formatMonthLabel(monthlySummaries.maxMonth.month, monthlySummaries.maxMonth.year)}</p>
                  <p className="text-lg font-bold text-slate-800">{monthlySummaries.maxMonth.expense.toFixed(0)} zł</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderWidth: '3px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                  <p className="text-xs text-purple-600 mb-1">Ostatni miesiąc</p>
                  <p className="text-lg font-semibold text-slate-800">{(() => {
                    const now = new Date();
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    return formatMonthLabel(lastMonth.getMonth(), lastMonth.getFullYear());
                  })()}</p>
                  <p className="text-lg font-bold text-purple-700">{monthlySummaries.lastMonthTotal.toFixed(0)} zł</p>
                  </div>
                </>
              ) : (
                <>
                  {monthlySummaries.maxMonth && (
                    <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderWidth: '3px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                      <p className="text-xs text-purple-600 mb-1">Najdroższy miesiąc</p>
                      <p className="text-lg font-semibold text-slate-800">{formatMonthLabel(monthlySummaries.maxMonth.month, monthlySummaries.maxMonth.year)}</p>
                      <p className="text-lg font-bold text-red-500">{monthlySummaries.maxMonth.expense.toFixed(0)} zł</p>
                    </div>
                  )}
                  {monthlySummaries.minMonth && (
                    <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderWidth: '3px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                      <p className="text-xs text-purple-600 mb-1">Najtańszy miesiąc</p>
                      <p className="text-lg font-semibold text-slate-800">{formatMonthLabel(monthlySummaries.minMonth.month, monthlySummaries.minMonth.year)}</p>
                      <p className="text-lg font-bold text-green-600">{monthlySummaries.minMonth.expense.toFixed(0)} zł</p>
                      </div>
                  )}
                  <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderWidth: '3px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                    <p className="text-xs text-purple-600 mb-1">Ostatni miesiąc</p>
                    <p className="text-lg font-semibold text-slate-800">{(() => {
                      const now = new Date();
                      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      return formatMonthLabel(lastMonth.getMonth(), lastMonth.getFullYear());
                    })()}</p>
                    <p className="text-lg font-bold text-slate-800">{monthlySummaries.lastMonthTotal.toFixed(0)} zł</p>
                  </div>
                </>
              )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ostatnie 6 miesięcy</CardTitle>
                <button
                  onClick={() => {
                    if (expandedMonths.size === monthlySummaries.months.length) {
                      setExpandedMonths(new Set());
                    } else {
                      setExpandedMonths(new Set(monthlySummaries.months.map(m => `${m.year}-${m.month}`)));
                    }
                  }}
                  className="text-sm px-3 py-1 rounded-lg transition"
                  style={{ backgroundColor: '#dec5fe' }}
                >
                  {expandedMonths.size === monthlySummaries.months.length ? 'Zwiń wszystko' : 'Rozwiń wszystko'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-6 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-red-500">↑</span>
                    <p className="text-slate-600">Większe niż +5% względem średniej</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">↓</span>
                    <p className="text-slate-600">Mniejsze niż -5% względem średniej</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-500">→</span>
                    <p className="text-slate-600">Mieszczą się w ±5% od średniej</p>
                  </div>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthlySummaries.months.map((m) => {
                const monthKey = `${m.year}-${m.month}`;
                const isExpanded = expandedMonths.has(monthKey);
                
                return (
                  <div key={monthKey}>
                    <div 
                      className="border border-slate-200 rounded-xl p-3 shadow-sm bg-white cursor-pointer hover:bg-slate-50 transition" 
                      style={{ borderLeftWidth: '5px', borderLeftColor: '#dec5fe' }}
                      onClick={() => {
                        const newExpanded = new Set(expandedMonths);
                        if (isExpanded) {
                          newExpanded.delete(monthKey);
                        } else {
                          newExpanded.add(monthKey);
                        }
                        setExpandedMonths(newExpanded);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">{m.fullLabel}</p>
                          <p className="text-lg font-semibold text-slate-800">{m.expense.toFixed(0)} zł</p>
                        </div>
                        <div className="text-2xl font-bold">
                          {m.direction === 'up' ? (
                            <span className="text-red-600">↑</span>
                          ) : m.direction === 'down' ? (
                            <span className="text-green-600">↓</span>
                          ) : (
                            <span className="text-slate-500">→</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && m.categoryTotals && m.categoryTotals.length > 0 && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Kategorie:</p>
                        <div className="space-y-1">
                          {m.categoryTotals.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-700">{cat.name}</span>
                                <span className="font-semibold text-slate-800">{cat.amount.toFixed(0)} zł</span>
                              </div>
                              <span className="text-lg font-bold">
                                {cat.direction === 'up' ? (
                                  <span className="text-red-600">↑</span>
                                ) : cat.direction === 'down' ? (
                                  <span className="text-green-600">↓</span>
                                ) : (
                                  <span className="text-slate-500">→</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'current' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{currentMonthInfo.label}</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Porównanie prognozy z wydatkami bieżącymi</p>
            </CardHeader>
            <CardContent>
              {loadingCurrentMonth && (
                <div className="text-center py-6 text-slate-500">Ładowanie...</div>
              )}

              {!loadingCurrentMonth && currentMonthPredictions && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-3">
                  <div className="rounded-2xl p-4 bg-gradient-to-r from-purple-100 to-purple-200" style={{ borderWidth: '3px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                    <p className="text-xs text-purple-700">Prognoza łączna</p>
                    <p className="text-2xl font-bold text-purple-900">{currentMonthPredictions.total_estimated.toFixed(2)} zł</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-white" style={{ borderWidth: '3px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                    <p className="text-xs text-purple-600">Wydano dotąd</p>
                    <p className="text-2xl font-bold text-slate-800">{(currentMonthPredictions.total_actual ?? 0).toFixed(2)} zł</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-white" style={{ borderWidth: '3px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                    <p className="text-xs text-purple-600">Różnica</p>
                    {(() => {
                      const diff = currentMonthPredictions.total_estimated - (currentMonthPredictions.total_actual ?? 0);
                      const color = diff >= 0 ? 'text-emerald-600' : 'text-red-500';
                      return <p className={`text-2xl font-bold ${color}`}>{diff >= 0 ? '+' : ''}{diff.toFixed(2)} zł</p>;
                    })()}
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                  <div className="overflow-x-auto rounded-2xl bg-white shadow-sm" style={{ borderLeftWidth: '4px', borderRightWidth: '4px', borderColor: '#dec5fe', borderStyle: 'solid' }}>
                      <table className="w-full text-sm text-slate-700">
                        <thead className="text-xs uppercase text-purple-600">
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4">Kategoria</th>
                            <th className="text-right py-3 px-4">Prognoza</th>
                            <th className="text-right py-3 px-4">Wydano</th>
                            <th className="text-right py-3 px-4">Różnica</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...currentMonthPredictions.predictions]
                            .filter((p) => p.has_data || (p.actual_amount && p.actual_amount > 0))
                            .sort((a, b) => {
                              const aName = expenseCategoriesOrdered.find((c) => c.id === a.category_id)?.name || a.category;
                              const bName = expenseCategoriesOrdered.find((c) => c.id === b.category_id)?.name || b.category;
                              return aName.localeCompare(bName);
                            })
                            .map((pred) => {
                              const diff = pred.estimated_amount - (pred.actual_amount ?? 0);
                              return (
                                <tr key={pred.category_id} className="border-b border-slate-100 last:border-0">
                                  <td className="py-3 px-4 font-medium text-slate-800">{pred.category}</td>
                                  <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{pred.estimated_amount.toFixed(2)} zł</td>
                                  <td className="py-3 px-4 text-right text-slate-700">{(pred.actual_amount ?? 0).toFixed(2)} zł</td>
                                  <td className={`py-3 px-4 text-right font-semibold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)} zł
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'future' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prognoza dla przyszłych miesięcy</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Wybierz miesiąc, aby zobaczyć szacowane wydatki i kierunek zmian</p>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div style={{ backgroundColor: '#dec5fe', padding: '1px', borderRadius: '8px', display: 'inline-block' }}>
                  <Dropdown
                    value={selectedPeriod}
                    options={futureMonths.map((period) => ({
                      value: period.value,  
                      label: period.label
                    }))}
                    onChange={(v) => setSelectedPeriod(v as string)}
                    className="w-full"
                  />
                </div>
              </div>

              {predictions && (
                <div className="grid md:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-2xl p-4  border border-slate-500">
                  <p className="text-xs text-purple-700">Suma przewidywanych wydatków</p>
                  <p className="text-2xl font-bold text-purple-900">{predictions.total_estimated.toFixed(2)} zł</p>
                </div>
              </div>
              )}

              {loadingPredictions && (
                <div className="text-center py-6 text-slate-500">Ładowanie predykcji...</div>
              )}

              {!loadingPredictions && predictions && (
                <div className="grid md:grid-cols-2 gap-3">
                {[...predictions.predictions]
                  .slice()
                  .sort((a, b) => b.estimated_amount - a.estimated_amount)
                  .map((pred) => {
                    const trendLabel = pred.trend_direction === 'up' ? 'Rosnące' : pred.trend_direction === 'down' ? 'Malejące' : 'Stabilne';
                    const trendClass = pred.trend_direction === 'up' ? 'text-red-600' : pred.trend_direction === 'down' ? 'text-emerald-600' : 'text-slate-600';
                    return (
                      <div
                          key={pred.category_id}
                          className={`flex items-center justify-between p-4 rounded-xl border ${
                            !pred.has_data ? 'opacity-60 bg-slate-50 border-dashed border-slate-200' : 'bg-white border-slate-200'
                          }`}
                          style={{ borderLeftWidth: '4px', borderLeftColor: '#dec5fe' }}
                        >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-800">{pred.category}</p>
                            {pred.trend_direction && pred.trend_direction !== 'none' && pred.trend_direction !== 'insufficient_data' && (
                              <span className={`text-xs font-semibold ${trendClass}`}>{trendLabel}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          {pred.has_data ? (
                            <p className="text-xl font-bold text-slate-800">{pred.estimated_amount.toFixed(2)} zł</p>
                          ) : (
                            <p className="text-sm font-medium text-slate-400">--- zł</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {!loadingPredictions && !predictions && (
              <div className="text-center py-6 text-slate-500">Nie udało się załadować predykcji</div>
            )}
            </CardContent>
          </Card>

          {/* {modelMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analiza modelu ML</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">Średni błąd (MAE)</p>
                  <p className="text-2xl font-bold text-blue-700">{modelMetrics.mae.toFixed(2)} zł</p>
                  <p className="text-xs text-blue-600 mt-1">Przeciętna odchyłka od rzeczywistości</p>
                </div>
                <div className={`p-4 rounded-2xl border ${
                  modelMetrics.r2 >= 0.8 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' :
                  modelMetrics.r2 >= 0.7 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200' :
                  'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
                }`}>
                  <p className={`text-xs mb-1 ${
                    modelMetrics.r2 >= 0.8 ? 'text-green-600' :
                    modelMetrics.r2 >= 0.7 ? 'text-yellow-600' :
                    'text-orange-600'
                  }`}>Dobroć dopasowania (R²)</p>
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
                    {modelMetrics.r2 >= 0.8 ? 'Doskonale' : modelMetrics.r2 >= 0.7 ? 'Dobrze' : 'Do poprawy'}
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Próbek treningowych</p>
                  <p className="text-2xl font-bold text-slate-700">{modelMetrics.training_samples}</p>
                  <p className="text-xs text-slate-600 mt-1">transakcji w historii</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Okres treningowy</p>
                  <p className="text-2xl font-bold text-slate-700">{modelMetrics.training_months}</p>
                  <p className="text-xs text-slate-600 mt-1">miesięcy danych</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-700">
                <strong>Wyjaśnienie:</strong><br/>
                • <strong>MAE</strong> - im mniej, tym lepiej (zł)<br/>
                • <strong>R²</strong> - procent wyjaśnionej wariancji (0-100%)<br/>
                • <strong>R² &gt; 80%</strong> = model bardzo dobry<br/>
                • <strong>R² 70-80%</strong> = model zadowalający<br/>
                • <strong>R² &lt; 70%</strong> = potrzeba więcej danych
              </div>
              </CardContent>
            </Card>
          )} */}

          {/* {featureImportance && featureImportance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ważność cech w modelu ML</CardTitle>
                <p className="text-sm text-slate-600 mt-1">Które czynniki mają największy wpływ na prognozy?</p>
              </CardHeader>
              <CardContent>
              <div className="space-y-3">
                {featureImportance.map((feature) => {
                  const percent = Math.round(feature.importance * 100);
                  const featureNames: Record<string, string> = {
                    category_encoded: 'Kategoria',
                    month_num: 'Miesiąc',
                    lag_1: 'Wydatek 1 miesiąc temu',
                    lag_2: 'Wydatek 2 miesiące temu',
                    lag_3: 'Wydatek 3 miesiące temu',
                    pct_change: 'Zmiana procentowa',
                    cv: 'Zmienność wydatków'
                  };
                  const displayName = featureNames[feature.name] || feature.name;
                  return (
                    <div key={feature.name} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-slate-700">{displayName}</span>
                          <span className="text-sm font-bold text-purple-700">{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-violet-600" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            </Card>
          )} */}

          {loadingFeatures && (
            <div className="text-center py-6 text-slate-500">Ładowanie informacji o modelu...</div>
          )}

          {/* {!loadingFeatures && !featureImportance && (
            <Card>
              <CardContent className="text-center">
                Model ML będzie dostępny po zebraniu większej liczby transakcji (minimum 30)
              </CardContent>
            </Card>
          )} */}
        </div>
      )}
    </div>
  );
}

export default Planning;
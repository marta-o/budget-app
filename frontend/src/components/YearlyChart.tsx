/**
 * YearlyChart - Bar chart displaying monthly income vs expenses.
 * If year is specified, shows data for that year.
 * If year is undefined, shows average monthly data across all years.
 * Transaction type is derived from category.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Transaction, Category, getTransactionType } from "../App";

interface YearlyChartProps {
  transactions: Transaction[];
  categories: Category[];
  year?: number;
}

export function YearlyChart({ transactions, categories, year }: YearlyChartProps) {
  // Polish month abbreviations for chart labels
  const monthNames = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

  // Display for a specific year - aggregate transactions by month
  if (year) {
    const monthlyData = transactions
      .filter((t) => new Date(t.date).getFullYear() === year)
      .reduce((acc, transaction) => {
        const month = new Date(transaction.date).getMonth();
        if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
        // Derive type from category
        const txType = getTransactionType(transaction, categories);
        if (txType === "income") acc[month].income += transaction.amount;
        else acc[month].expenses += transaction.amount;
        return acc;
      }, {} as Record<number, { month: number; income: number; expenses: number }>);

    const chartData = monthNames.map((name, index) => ({
      month: name,
      income: monthlyData[index]?.income || 0,
      expenses: monthlyData[index]?.expenses || 0,
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Przegląd {year}</CardTitle>
          <CardDescription>Porównanie miesięczne</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efe6ff" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#ac85e0" />
              <YAxis tick={{ fontSize: 12 }} stroke="#ac85e0" />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e6e0ff", borderRadius: "8px" }} />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Bar dataKey="income" fill="#6fd4afff" name="Przychody" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" fill="#f37f88ff" name="Wydatki" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // No specific year selected - show average monthly data across all years for trend analysis
  const yearsSet = new Set<number>();
  transactions.forEach((t) => yearsSet.add(new Date(t.date).getFullYear()));
  const yearsCount = yearsSet.size || 1;

  const monthlyTotals = transactions.reduce((acc, transaction) => {
    const month = new Date(transaction.date).getMonth();
    if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
    // Derive type from category
    const txType = getTransactionType(transaction, categories);
    if (txType === "income") acc[month].income += transaction.amount;
    else acc[month].expenses += transaction.amount;
    return acc;
  }, {} as Record<number, { month: number; income: number; expenses: number }>);

  const chartData = monthNames.map((name, index) => ({
    month: name,
    income: +((monthlyTotals[index]?.income || 0) / yearsCount).toFixed(2),
    expenses: +((monthlyTotals[index]?.expenses || 0) / yearsCount).toFixed(2),
  }));

  return (
    <Card>
      <CardHeader> 
        <CardTitle className="text-base">Średnie miesięczne (wszystkie lata)</CardTitle>
        <CardDescription>Średnia przychodów i wydatków na miesiąc</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#efe6ff" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#ac85e0" />
            <YAxis tick={{ fontSize: 12 }} stroke="#ac85e0" />
            <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e6e0ff", borderRadius: "8px" }} />
            <Legend wrapperStyle={{ paddingTop: 8 }} />
            <Bar dataKey="income" fill="#6fd4afff" name="Średnie przychody" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" fill="#f37f88ff" name="Średnie wydatki" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default YearlyChart;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '../App';

interface YearlyChartProps {
  transactions: Transaction[];
  year?: number; // if undefined -> average per month across available years
}

export function YearlyChart({ transactions, year }: YearlyChartProps) {

  const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

  if (year) {
    const monthlyData = transactions
      .filter(t => new Date(t.date).getFullYear() === year)
      .reduce((acc, transaction) => {
        const month = new Date(transaction.date).getMonth();
        if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
        if (transaction.type === 'income') acc[month].income += transaction.amount;
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
          <CardTitle>Przegląd {year}</CardTitle>
          <CardDescription>Porównanie miesięczne</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Przychody" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" name="Wydatki" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  const yearsSet = new Set<number>();
  transactions.forEach(t => yearsSet.add(new Date(t.date).getFullYear()));
  const yearsCount = yearsSet.size || 1;

  const monthlyTotals = transactions.reduce((acc, transaction) => {
    const month = new Date(transaction.date).getMonth();
    if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
    if (transaction.type === 'income') acc[month].income += transaction.amount;
    else acc[month].expenses += transaction.amount;
    return acc;
  }, {} as Record<number, { month: number; income: number; expenses: number }>);

  const chartData = monthNames.map((name, index) => ({
    month: name,
    income: +( (monthlyTotals[index]?.income || 0) / yearsCount ).toFixed(2),
    expenses: +( (monthlyTotals[index]?.expenses || 0) / yearsCount ).toFixed(2),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Średnie miesięczne (wszystkie lata)</CardTitle>
        <CardDescription>Średnia przychodów i wydatków na miesiąc</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="income" fill="#10b981" name="Średnie przychody" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#ef4444" name="Średnie wydatki" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default YearlyChart;
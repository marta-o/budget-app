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
              <CartesianGrid strokeDasharray="3 3" stroke="#efe6ff" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#5b21b6" />
              <YAxis tick={{ fontSize: 12 }} stroke="#5b21b6" />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e6e0ff', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Bar dataKey="income" fill="#B983FF" name="Przychody" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" fill="#7C3AED" name="Wydatki" radius={[6, 6, 0, 0]} />
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
    income: +(((monthlyTotals[index]?.income || 0) / yearsCount).toFixed(2)),
    expenses: +(((monthlyTotals[index]?.expenses || 0) / yearsCount).toFixed(2)),
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
            <CartesianGrid strokeDasharray="3 3" stroke="#efe6ff" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#5b21b6" />
            <YAxis tick={{ fontSize: 12 }} stroke="#5b21b6" />
            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e6e0ff', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ paddingTop: 8 }} />
            {/* blue and purple for the average view */}
            <Bar dataKey="income" fill="#94B3FD" name="Średnie przychody" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" fill="#B983FF" name="Średnie wydatki" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default YearlyChart;
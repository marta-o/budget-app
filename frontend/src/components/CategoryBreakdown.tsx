/**
 * CategoryBreakdown - Pie chart showing expense distribution by category.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Transaction, Category, getTransactionType } from "../App";

interface CategoryBreakdownProps {
  transactions: Transaction[];
  categories: Category[];
}

// Color palette for pie chart segments
const COLORS = [
  "#f37f88ff", 
  "#eeac72ff", 
  "#75e6f5ff", 
  "#6fd4afff", 
  "#72b3fdff", 
  "#a487f1ff", 
  "#f18dc4ff", 
  "#dbc232ff", 
];

export function CategoryBreakdown({ transactions, categories }: CategoryBreakdownProps) {
  // Group expenses by category
  const expensesByCategory = transactions
    .filter((t) => getTransactionType(t, categories) === "expense")
    .reduce((acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = 0;
      }
      acc[transaction.category] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

  // Transform data for pie chart
  const chartData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Podział Wydatków</CardTitle>
        <CardDescription>Wydatki według kategorii</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Brak danych o wydatkach</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {chartData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span>{item.value.toFixed(2)} zł</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

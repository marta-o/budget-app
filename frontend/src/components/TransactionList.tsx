import { ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Transaction } from '../App';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (id: string, transaction: Omit<Transaction, 'id'>) => void;
}

export function TransactionList({ transactions, onDelete, onEdit }: TransactionListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleEditInline = (transaction: Transaction) => {
    const newTitle = window.prompt('Tytuł', transaction.title ?? transaction.category ?? '');
    if (newTitle === null) return;
    const newAmountStr = window.prompt('Kwota', String(transaction.amount));
    if (newAmountStr === null) return;
    const newAmount = Number(newAmountStr);
    if (Number.isNaN(newAmount)) {
      alert('Nieprawidłowa kwota');
      return;
    }
    const payload: Omit<Transaction, 'id'> = {
      title: newTitle,
      amount: newAmount,
      type: transaction.type,
      category_id: transaction.category_id ?? null,
      category: transaction.category,
      date: transaction.date,
    };
    onEdit(transaction.id, payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ostatnie Transakcje</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Brak transakcji</p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'income'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowUpCircle className="w-5 h-5" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{transaction.title ?? transaction.category}</p>
                      {transaction.category && <Badge variant="outline" className="text-xs">{transaction.category}</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(transaction.date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <p className={`${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)} zł
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditInline(transaction)} aria-label="Edytuj">✎</Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(transaction.id)} aria-label="Usuń"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

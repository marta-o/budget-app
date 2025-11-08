import React, { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Transaction, Category } from '../App';
import { EditTransactionDialog } from './EditTransactionDialog';
import { DeleteTransactionDialog} from './DeleteTransactionDialog';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  categories?: Category[];
}

export function TransactionList({ transactions, onDelete, onEdit, categories = [] }: TransactionListProps) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openEdit = (tx: Transaction) => {
    setSelected(tx);
    setTimeout(() => setIsEditOpen(true), 0);
  };

  const handleEdit = (id: string, payload: Omit<Transaction, 'id'>) => {
    onEdit(id, payload);
    setIsEditOpen(false);
    setSelected(null);
  };

    const openDelete = (tx: Transaction) => {
    setToDelete(tx);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!toDelete) return;
    onDelete(toDelete.id);
    setIsDeleteOpen(false);
    setToDelete(null);
  };

  return (
    <>
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
                        <p className="truncate font-medium">{transaction.title || transaction.category}</p>
                        {transaction.category ? (
                          <Badge variant="outline" className="text-xs">{transaction.category}</Badge>
                        ) : null}
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
                      <Button variant="ghost" size="icon" onClick={() => openEdit(transaction)} aria-label="Edytuj">✎</Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(transaction)} aria-label="Usuń"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <EditTransactionDialog
        open={isEditOpen}
        onOpenChange={(v) => {
          setIsEditOpen(v);
          if (!v) setSelected(null);
        }}
        transaction={selected}
        onUpdate={handleEdit}
        categories={categories}
      />

      <DeleteTransactionDialog
        open={isDeleteOpen}
        onOpenChange={(v) => {
          setIsDeleteOpen(v);
          if (!v) setToDelete(null);
        }}
        onConfirm={handleDelete}
        />
    </>
  );
}

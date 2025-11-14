import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import { Transaction, Category } from '../App';

interface EditTransactionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  transaction: Transaction | null;
  onUpdate: (id: string, payload: Omit<Transaction, 'id'>) => void;
  categories?: Category[];
}

export function EditTransactionDialog({
  open = false,
  onOpenChange,
  transaction,
  onUpdate,
  categories = [],
}: EditTransactionDialogProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const visibleCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!transaction) {
      setTitle('');
      setAmount('');
      setType('expense');
      setCategoryId('');
      setDate(new Date().toISOString().split('T')[0]);
      return;
    }
    setTitle(transaction.title ?? '');
    setAmount(String(transaction.amount ?? ''));
    setType(transaction.type ?? 'expense');
    setDate(transaction.date ?? new Date().toISOString().split('T')[0]);

    const txCatId = transaction.category_id;
    if (txCatId != null) {
      const cat = categories.find((c) => c.id === txCatId);
      if (cat && cat.type === (transaction.type ?? 'expense')) {
        setCategoryId(txCatId);
      } else {
        setCategoryId('');
      }
    } else {
      setCategoryId('');
    }
  }, [transaction, categories]);

  useEffect(() => {
    if (categoryId !== '' && !visibleCategories.some((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [type, categories, categoryId, visibleCategories]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!transaction) return;
    const payload: Omit<Transaction, 'id'> = {
      title,
      amount: Number(amount),
      type,
      category_id: categoryId === '' ? null : Number(categoryId),
      category: categories.find((c) => c.id === Number(categoryId))?.name ?? '',
      date,
    };
    onUpdate(transaction.id, payload);
    onOpenChange?.(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange?.(v)}>
      <DialogContent className="max-w-md sm:max-w-lg rounded-xl shadow-2xl p-0 bg-white/40 backdrop-blur-2xl border border-white/30 text-gray-900">
        <DialogHeader className="text-center pb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl text-white">
          <DialogTitle className="text-xl font-semibold tracking-tight text-white">
            Edytuj transakcję
          </DialogTitle>
          <DialogDescription className="text-sm opacity-90 text-white">
            Zmodyfikuj dane i zapisz zmiany.
          </DialogDescription>
        </DialogHeader>


        <form onSubmit={submit} className="space-y-3 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={type}
              onChange={(e) => setType(e.target.value as 'income' | 'expense')}
            >
              <option value="expense">Wydatek</option>
              <option value="income">Przychód</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategoria
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={String(categoryId)}
              onChange={(e) =>
                setCategoryId(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tytuł
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Np. zakupy, pensja..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kwota
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                type="button"
              >
                Anuluj
              </Button>
            </DialogClose>

            <Button type="submit">
              Zapisz zmiany
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

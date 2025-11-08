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

export function EditTransactionDialog({ open = false, onOpenChange, transaction, onUpdate, categories = [] }: EditTransactionDialogProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income'|'expense'>('expense');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const visibleCategories = categories.filter(c => c.type === type);

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
      const cat = categories.find(c => c.id === txCatId);
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
    if (categoryId !== '' && !visibleCategories.some(c => c.id === categoryId)) {
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
      category: categories.find(c => c.id === Number(categoryId))?.name ?? '',
      date,
    };
    onUpdate(transaction.id, payload);
    onOpenChange?.(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange?.(v)}>
      <DialogContent className="max-w-md bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle>Edytuj transakcję</DialogTitle>
          <DialogDescription>Zmodyfikuj dane i zapisz zmiany.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3 mt-2">
          <div>
            <label className="block text-sm mb-1">Typ</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={type}
              onChange={e => setType(e.target.value as 'income' | 'expense')}
            >
              <option value="expense">Wydatek</option>
              <option value="income">Przychód</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Kategoria</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={String(categoryId)}
              onChange={e => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              {visibleCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Tytuł</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Np. zakupy, pensja..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Kwota</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Data</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="ghost" type="button">Anuluj</Button>
            </DialogClose>
            <Button type="submit">Zapisz</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
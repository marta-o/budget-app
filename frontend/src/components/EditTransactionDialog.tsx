import { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
// import { Input } from './ui/input';
// import { Label } from './ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
// import { Textarea } from './ui/textarea';
import { Transaction, Category } from '../App';

interface EditTransactionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  transaction: Transaction | null;
  onUpdate: (id: string, payload: Omit<Transaction, 'id'>) => void;
  categories?: Category[];
}

export function EditTransactionDialog({ open, onOpenChange, transaction, onUpdate, categories = [] }: EditTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income'|'expense'>('expense');
  const [categoryId, setCategoryId] = useState<number | ''>('');

  useEffect(() => {
    if (typeof open !== 'undefined') setIsOpen(open);
  }, [open]);

  useEffect(() => {
    if (transaction) {
      setTitle(transaction.title ?? '');
      setAmount(String(transaction.amount ?? ''));
      setType(transaction.type ?? 'expense');
      setCategoryId(transaction.category_id ?? '');
      setIsOpen(true);
    } else {
      setTitle('');
      setAmount('');
      setType('expense');
      setCategoryId('');
    }
  }, [transaction]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!transaction) return;
    onUpdate(transaction.id, {
      title,
      amount: Number(amount),
      type,
      category_id: categoryId === '' ? null : Number(categoryId),
      category: categories.find(c => c.id === Number(categoryId))?.name ?? '',
      date: transaction.date ?? new Date().toISOString().split('T')[0],
    });
    setIsOpen(false);
    onOpenChange?.(false);
  };

  if (!transaction) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); onOpenChange?.(v); }}>
      <DialogTrigger asChild>
        <Button variant="ghost"><Edit2 className="w-4 h-4 mr-2" />Edytuj</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Edytuj transakcję</DialogTitle>
        <DialogDescription>Zmodyfikuj dane transakcji i zapisz zmiany.</DialogDescription>

        <form onSubmit={submit} className="space-y-3 mt-2">
          <input className="w-full border px-2 py-1" placeholder="Tytuł" value={title} onChange={e => setTitle(e.target.value)} required />
          <input className="w-full border px-2 py-1" placeholder="Kwota" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          <select className="w-full border px-2 py-1" value={String(categoryId)} onChange={e => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Brak kategorii</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <select value={type} onChange={e => setType(e.target.value as any)} className="border px-2 py-1">
              <option value="expense">Wydatek</option>
              <option value="income">Przychód</option>
            </select>
            <div className="flex gap-2 ml-auto">
              <Button type="submit">Zapisz</Button>
              <DialogClose asChild><Button variant="ghost">Anuluj</Button></DialogClose>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
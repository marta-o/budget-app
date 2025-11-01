import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { Transaction, Category } from '../App';

interface AddTransactionDialogProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  categories?: Category[];
}

export function AddTransactionDialog({ onAdd, categories = [] }: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income'|'expense'>('expense');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      alert('Podaj kwotę.');
      return;
    }
    const payload: Omit<Transaction, 'id'> = {
      title: title || (type === 'expense' ? 'Wydatek' : 'Przychód'),
      amount: Number(amount),
      type,
      category_id: categoryId === '' ? null : Number(categoryId),
      category: categories.find(c => c.id === Number(categoryId))?.name ?? '',
      date,
      // date: new Date().toISOString().split('T')[0],
    };

    onAdd(payload);
    setTitle(''); setAmount(''); setCategoryId(''); setType('expense');     
    setDate(new Date().toISOString().split("T")[0]);
    setIsOpen(false);
  };

  return (
    <>
      <Button className="gap-2" onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4" />
        Dodaj Transakcję
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>Dodaj Transakcję</DialogTitle>
            <DialogDescription>Dodaj nowy przychód lub wydatek.</DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
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
              <option value="">Brak kategorii</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
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
              step="1"
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
              <Button variant="ghost" type="button">
                Anuluj
              </Button>
            </DialogClose>
            <Button type="submit">Dodaj</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>
  );
}
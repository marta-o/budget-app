import { useState } from 'react';
import { Plus } from 'lucide-react';
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

interface AddTransactionDialogProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  categories?: Category[];
}

export function AddTransactionDialog({ onAdd, categories = [] }: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const visibleCategories = categories.filter(c => c.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      alert('Podaj kwotę.');
      return;
    }
    const payload: Omit<Transaction, 'id'> = {
      title,
      amount: Number(amount),
      type,
      category_id: categoryId === '' ? null : Number(categoryId),
      category: categories.find(c => c.id === Number(categoryId))?.name ?? '',
      date,
    };
    onAdd(payload);

    setTitle('');
    setAmount('');
    setCategoryId('');
    setType('expense');
    setDate(new Date().toISOString().split("T")[0]);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        className="gap-2"
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: "#94DAFF", color: "#000000" }}
      >
        <Plus className="w-4 h-4" />
        Dodaj Transakcję
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-xl shadow-2xl p-0 bg-white/40 backdrop-blur-2xl border border-white/30 text-gray-900">
          <DialogHeader className="text-center pb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl text-white">
            <DialogTitle className="text-xl font-semibold tracking-tight text-white">
              Dodaj transakcję
            </DialogTitle>
            <DialogDescription className="text-sm opacity-90 text-white">
              Dodaj nowy przychód lub wydatek.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2 px-5 pb-5 pt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={type}
                onChange={e => setType(e.target.value as 'income' | 'expense')}
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
                onChange={e =>
                  setCategoryId(e.target.value === '' ? '' : Number(e.target.value))
                }
              >
                {visibleCategories.map(c => (
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
                onChange={e => setTitle(e.target.value)}
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
                onChange={e => setAmount(e.target.value)}
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
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-0 !bg-[#94DAFF] !text-black hover:!bg-[#7ecfff]"
                  style={{ backgroundColor: "#94DAFF", color: "#000000" }}
                  type="button"
                >
                  Anuluj
                </Button>
              </DialogClose>

              <Button
                type="submit"
                className="!bg-white !text-black"
                style={{ backgroundColor: "#ffffff", color: "#000000" }}
              >
                Dodaj
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

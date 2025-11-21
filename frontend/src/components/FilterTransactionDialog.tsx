import { useEffect, useState, useMemo } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './ui/dialog';
import { Category } from '../App';

interface FilterValues {
  type: 'all' | 'income' | 'expense';
  categoryId: string;
  start: string;
  end: string;
}

interface FilterDialogProps {
  initial?: Partial<FilterValues>;
  categories?: Category[];
  onApply: (values: FilterValues) => void;
}

export function FilterTransactionDialog({ initial = {}, categories = [], onApply }: FilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'all' | 'income' | 'expense'>(initial.type ?? 'all');
  const [categoryId, setCategoryId] = useState<string>(initial.categoryId ?? '');
  const [start, setStart] = useState<string>(initial.start ?? '');
  const [end, setEnd] = useState<string>(initial.end ?? '');
  
  useEffect(() => {
    setType(initial.type ?? 'all');
    setCategoryId(initial.categoryId ?? '');
    setStart(initial.start ?? '');
    setEnd(initial.end ?? '');
  }, [initial]);

  const visibleCategories = categories.filter(c => type === 'all' ? true : c.type === type);

  const handleApply = () => {
    onApply({ type, categoryId, start, end });
    setOpen(false);
  };

  const handleClear = () => {
    setType('all');
    setCategoryId('');
    setStart('');
    setEnd('');
  };

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>Filtruj</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                Filtruj transakcje
            </DialogTitle>
            <DialogDescription className="text-sm opacity-90 text-white">
              Filtruj transakcje według typu, kategorii i daty.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <label className="block text-sm mb-1">Typ</label>
              <select className="w-full border px-3 py-2 rounded" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="all">Wszystkie</option>
                <option value="income">Przychód</option>
                <option value="expense">Wydatek</option>
              </select>
            </div>

            {type === 'all' ? (
              <div className="text-sm text-slate-750">Wybierz typ transakcji, aby filtrować po kategoriach</div>
            ) : (
              <label className="flex flex-col">
                <span className="text-sm mb-1">Kategoria</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="p-2 rounded border" aria-label="Filtruj po kategorii">
                  <option value="">Wybierz kategorię</option>
                  {visibleCategories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex items-center gap-2">Daty transakcji</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="p-2 rounded border" />
            <span className="text-sm">—</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="p-2 rounded border" />
          </div>

          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Anuluj</Button></DialogClose>
            <div className="flex gap-2">
              <Button className="bg-gray-200" onClick={handleClear}>Wyczyść</Button>
              <Button onClick={handleApply}>Zastosuj</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FilterTransactionDialog;

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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initial?: Partial<FilterValues>;
  categories: Category[];
  onApply: (values: FilterValues) => void;
}

export function FilterTransactionDialog({ open = false, onOpenChange, initial = {}, categories = [], onApply }: FilterDialogProps) {
  const [tmpType, setTmpType] = useState<'all' | 'income' | 'expense'>(initial.type ?? 'all');
  const [tmpCategoryId, setTmpCategoryId] = useState<string>(initial.categoryId ?? '');
  const [tmpStart, setTmpStart] = useState<string>(initial.start ?? '');
  const [tmpEnd, setTmpEnd] = useState<string>(initial.end ?? '');
  

  useEffect(() => {
    if (open) {
      setTmpType(initial.type ?? 'all');
      setTmpCategoryId(initial.categoryId ?? '');
      setTmpStart(initial.start ?? '');
      setTmpEnd(initial.end ?? '');
    
    }
  }, [open]);

  const visibleTmpCategories = useMemo(() => {
    if (tmpType === 'all') return categories;
    return categories.filter((c) => c.type === tmpType);
  }, [categories, tmpType]);

  useEffect(() => {
    if (tmpCategoryId === '') return;
    const exists = visibleTmpCategories.some((c) => String(c.id) === tmpCategoryId);
    if (!exists) setTmpCategoryId('');
  }, [tmpType, visibleTmpCategories, tmpCategoryId]);

  const handleApply = () => {
    onApply({ type: tmpType, categoryId: tmpCategoryId, start: tmpStart, end: tmpEnd });
    onOpenChange?.(false);
  };

  const handleClear = () => {
    setTmpType('all');
    setTmpCategoryId('');
    setTmpStart('');
    setTmpEnd('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="p-2">Filtruj</Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg rounded-xl shadow-2xl p-0 bg-white/40 backdrop-blur-2xl border border-white/30 text-gray-900">
        <DialogHeader>
          <DialogTitle>Filtruj transakcje</DialogTitle>
          <DialogDescription>Ustaw filtry, a następnie kliknij „Zastosuj”.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-3 p-4">
          <label className="flex flex-col">
            <span className="text-sm mb-1">Typ transakcji</span>
            <select value={tmpType} onChange={(e) => setTmpType(e.target.value as any)} className="p-2 rounded border">
              <option value="all">Wszystkie</option>
              <option value="income">Przychody</option>
              <option value="expense">Wydatki</option>
            </select>
          </label>

          {tmpType === 'all' ? (
            <div className="text-sm text-slate-750">Wybierz typ transakcji, aby filtrować po kategoriach</div>
          ) : (
            <label className="flex flex-col">
              <span className="text-sm mb-1">Kategoria</span>
              <select value={tmpCategoryId} onChange={(e) => setTmpCategoryId(e.target.value)} className="p-2 rounded border" aria-label="Filtruj po kategorii">
                <option value="">Wybierz kategorię</option>
                {visibleTmpCategories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-2">
            <input type="date" value={tmpStart} onChange={(e) => setTmpStart(e.target.value)} className="p-2 rounded border" />
            <span className="text-sm">—</span>
            <input type="date" value={tmpEnd} onChange={(e) => setTmpEnd(e.target.value)} className="p-2 rounded border" />
          </label>
        
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Anuluj</Button>
          </DialogClose>
          <div className="flex gap-2">
            <Button className="bg-gray-200" onClick={handleClear}>Wyczyść</Button>
            <Button onClick={handleApply}>Zastosuj</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FilterTransactionDialog;

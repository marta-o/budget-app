import { useState, useRef, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Transaction, Category } from '../App';
import { EditTransactionDialog } from './EditTransactionDialog';
import { DeleteTransactionDialog} from './DeleteTransactionDialog';
import { AddTransactionDialog } from './AddTransactionDialog';
import Dropdown from './ui/dropdown';
import { FilterTransactionDialog } from './FilterTransactionDialog';

interface FilterVals {
  type: 'all' | 'income' | 'expense';
  categoryId: string[];
  start: string;
  end: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  categories?: Category[];
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  q: string;
  setQ: (v: string) => void;
  onApplyFilters: (vals: FilterVals) => void;
  onClearFilters: () => void;
  currentFilters: FilterVals;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export function TransactionList({
  transactions,
  onDelete,
  onEdit,
  categories = [],
  onAdd,
  q,
  setQ,
  onApplyFilters,
  onClearFilters,
  currentFilters,
  showFilters,
  onToggleFilters,
}: TransactionListProps) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [localShowFilters, setLocalShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);

  const effectiveShowFilters = (typeof showFilters !== 'undefined') ? showFilters : localShowFilters;

  useEffect(() => {
    if (effectiveShowFilters) {
      setTimeout(() => filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
    }
  }, [effectiveShowFilters]);

  const visibleCategories = categories.filter(c =>
    currentFilters.type === 'all' ? true : c.type === currentFilters.type
  );

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

  // const applyFilterChange = (partial: Partial<FilterVals>) => {
  //   const next = { ...currentFilters, ...partial } as FilterVals;
  //   if (partial.type && partial.type !== 'all') {
  //     const exists = categories.some(c => String(c.id) === String(next.categoryId) && c.type === partial.type);
  //     if (!exists) next.categoryId = '';
  //   } else if (partial.type === 'all') {
  //     next.categoryId = '';
  //   }
  //   onApplyFilters(next);
  // };

  return (
    <>
      <div className="w-full flex justify-center items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AddTransactionDialog onAdd={onAdd} categories={categories} />
          <Button 
            variant="ghost"
            style={{ backgroundColor: "#94B3FD", color: "#000000" }}
            className="border-0 hover:bg-[#7ecfff]"
            onClick={() => { if (onToggleFilters) { onToggleFilters(); } else { setLocalShowFilters(v => !v); } }}>
            Filtruj
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            className="border-0"
            style={{ backgroundColor: "#94B3FD", color: "#0f172a" }}
             onClick={() => {
               setSearchVisible(prev => {
                 const next = !prev;
                 if (!next) {
                   setQ('');
                 } else {
                   setTimeout(() => (document.getElementById('tx-search') as HTMLInputElement)?.focus(), 0);
                 }
                 return next;
               });
             }}
          >
            Szukaj
          </Button>

          {q && (
            <Button variant="ghost" onClick={() => setQ('')}>Wyczyść</Button>
          )}

          {searchVisible && (
            <input
              id="tx-search"
              name="tx-search"
              autoComplete="off"
              placeholder="Szukaj..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="p-2 rounded border"
            />
          )}
         </div>
      </div>

      {effectiveShowFilters && (
        <div ref={filtersRef} id="filters-block" className="mb-4 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2 p-4 rounded-2xl" style={{ backgroundColor: "#94B3FD" }}>
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ fontWeight: 700 }}>Typ</label>
              <div className="w-40">
                <Dropdown
                  value={currentFilters.type}
                  options={[
                    { value: 'all', label: 'Wszystkie' },
                    { value: 'expense', label: 'Wydatek' },
                    { value: 'income', label: 'Przychód' }
                  ]}
                  onChange={(v) => {
                    const newType = v as FilterVals['type'];
                    onApplyFilters({ ...currentFilters, type: newType, categoryId: [] });
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ fontWeight: 700 }}>Kategoria</label>
              <div className="w-48">
                <Dropdown
                  multi
                  value={currentFilters.categoryId}
                  options={visibleCategories.map(c => ({ value: String(c.id), label: c.name }))}
                  onChange={(v) => onApplyFilters({ ...currentFilters, categoryId: Array.isArray(v) ? v : [] })}
                  placeholder="Wszystkie"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ fontWeight: 700 }}>Od</label>
              <input
                type="date"
                className="border border-slate-300 px-3 py-2 rounded-md bg-white"
                value={currentFilters.start}
                onChange={e => onApplyFilters({ ...currentFilters, start: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ fontWeight: 700 }}>Do</label>
              <input
                type="date"
                className="border border-slate-300 px-3 py-2 rounded-md bg-white"
                value={currentFilters.end}
                onChange={e => onApplyFilters({ ...currentFilters, end: e.target.value })}
              />
            </div>

            <div>
              <Button
                onClick={onClearFilters}
                style={{ backgroundColor: "#ffffff", color: "#000000" }}
              >
                Wyczyść
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AddTransactionDialog onAdd={onAdd} categories={categories} />
          <FilterTransactionDialog initial={currentFilters} categories={categories} onApply={(vals) => onApplyFilters(vals)} />
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={() => { setSearchVisible(prev => !prev); if (!searchVisible) setTimeout(() => (document.getElementById('tx-search') as HTMLInputElement)?.focus(), 0); }}>
              Szukaj
            </Button>
            {searchVisible && (
              <input
                id="tx-search"
                placeholder="Szukaj..."
                value={q}
                onChange={e => setQ(e.target.value)}
                className="p-2 rounded border"
              />
            )}
          </div>
          {(currentFilters.type !== 'all' || currentFilters.categoryId || currentFilters.start || currentFilters.end || q) && (
            <Button variant="default" onClick={onClearFilters}>
              Wyczyść filtry
            </Button>
          )}
        </div>
      </div> */}
    
      <Card>
        <CardHeader> 
          <CardTitle  style={{fontWeight: 700 }}>Ostatnie Transakcje</CardTitle>
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
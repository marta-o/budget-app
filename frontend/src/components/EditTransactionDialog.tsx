/**
 * EditTransactionDialog - Modal dialog for editing existing transactions.
 */
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/calendarview";
import { Dropdown } from './ui/dropdown';import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import { Transaction, Category, getTransactionType } from "../App";

interface EditTransactionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  transaction: Transaction | null;
  onUpdate: (id: string, payload: Omit<Transaction, "id">) => void;
  categories?: Category[];
}

export function EditTransactionDialog({
  open = false,
  onOpenChange,
  transaction,
  onUpdate,
  categories = [],
}: EditTransactionDialogProps) {
  // Form fields
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter categories based on selected type filter
  const visibleCategories = categories.filter((c) => c.type === type);

  // Populate form fields when transaction changes.
  useEffect(() => {
    if (!transaction) {
      setTitle("");
      setAmount("");
      setType("expense");
      setCategoryId("");
      setDate(new Date().toISOString().split("T")[0]);
      return;
    }
    setTitle(transaction.title ?? "");
    setAmount(String(transaction.amount ?? ""));
    setDate(transaction.date ?? new Date().toISOString().split("T")[0]);

    // Derive type from transaction's category
    const txType = getTransactionType(transaction, categories);
    setType(txType);

    // Set category if it matches the derived type
    const txCatId = transaction.category_id;
    if (txCatId != null) {
      const cat = categories.find((c) => c.id === txCatId);
      if (cat && cat.type === txType) {
        setCategoryId(txCatId);
      } else {
        setCategoryId("");
      }
    } else {
      setCategoryId("");
    }
  }, [transaction, categories]);

  // Reset categoryId when type filter changes and current category is no longer in the visible categories list.
  useEffect(() => {
    if (categoryId !== "" && !visibleCategories.some((c) => c.id === categoryId)) {
      setCategoryId("");
    }
  }, [type, categories, categoryId, visibleCategories]);

  // Submit the edited transaction. 
  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!transaction) return;

    const selectedCategory = categories.find((c) => c.id === Number(categoryId));
    const payload: Omit<Transaction, "id"> = {
      title,
      amount: Number(amount),
      category_id: categoryId === "" ? null : Number(categoryId),
      category: selectedCategory?.name ?? "",
      category_type: selectedCategory?.type ?? "expense",
      date,
    };
    onUpdate(transaction.id, payload);
    onOpenChange?.(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange?.(v)}>
      <DialogContent className="max-w-md sm:max-w-lg rounded-xl shadow-2xl p-0 bg-white/40 backdrop-blur-2xl border border-white/30 text-gray-900">
        <DialogHeader className="text-center pb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl">
          <DialogTitle className="text-xl font-semibold tracking-tight text-black">
            Edytuj transakcję
          </DialogTitle>
          <DialogDescription className="text-sm opacity-90 text-black">
            Zmodyfikuj dane i zapisz zmiany.
          </DialogDescription>
        </DialogHeader>


        <form onSubmit={submit} className="space-y-3 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ
            </label>
            <Dropdown
              value={type}
              options={[
                { value: "expense", label: "Wydatek" },
                { value: "income", label: "Przychód" }
              ]}
              onChange={(e) => setType(e as 'income' | 'expense')}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategoria
            </label>
            <Dropdown
              value={String(categoryId)}
              options={visibleCategories.map((c) => ({
                value: String(c.id),
                label: c.name
              }))}
              onChange={(e) =>
                setCategoryId(e === '' ? '' : Number(e))
              }
              className="w-full"
            />
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
            <DatePicker
              value={date}
              onChange={(v) => setDate(v)}
              placeholder="Wybierz datę"
              fromYear={2000}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="border-0 !bg-[#ac85e0ff] !text-black"
                style={{ backgroundColor: "#caa5fcff", color: "#000000" }}
                type="button"
              >
                Anuluj
              </Button>
            </DialogClose>
  
            <Button
              type="submit"
              className="!bg-[#ffffffff] !text-black"
              style={{ backgroundColor: "#ffffffff", color: "#000000" }}
            >
              Zapisz zmiany
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

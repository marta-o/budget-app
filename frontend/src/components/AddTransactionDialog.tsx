/**
 * AddTransactionDialog - Modal dialog for creating new transactions.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/calendarview";
import { Dropdown } from "./ui/dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import { Transaction, Category } from "../App";

interface AddTransactionDialogProps {
  onAdd: (transaction: Omit<Transaction, "id">) => void;
  categories?: Category[];
}

export function AddTransactionDialog({ onAdd, categories = [] }: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Form state for new transaction
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const getLastDayOfMonth = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0);
  };

  // Filter categories based on selected type (income or expense)
  const visibleCategories = categories.filter((c) => c.type === type);

  // Submit form - validate and call onAdd callback
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      alert("Podaj kwotę.");
      return;
    }

    // Get selected category to determine type and name
    const selectedCategory = categories.find((c) => c.id === Number(categoryId));

    const payload: Omit<Transaction, "id"> = {
      title,
      amount: Number(amount),
      category_id: categoryId === "" ? null : Number(categoryId),
      category: selectedCategory?.name ?? "",
      category_type: selectedCategory?.type ?? "expense",
      date,
    };
    onAdd(payload);

    // Reset form to initial state
    setTitle("");
    setAmount("");
    setCategoryId("");
    setType("expense");
    setDate(new Date().toISOString().split("T")[0]);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        className="gap-2"
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: "#dec5feff", color: "#000000" }}
      >
        <Plus className="w-4 h-4" />
        Dodaj Transakcję
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-xl shadow-2xl bg-white/40 backdrop-blur-2xl border border-white/30 text-gray-900">
          <DialogHeader className="text-center pb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl">
            <DialogTitle className="text-xl font-semibold tracking-tight text-black">
              Dodaj transakcję
            </DialogTitle>
            <DialogDescription className="text-sm opacity-90 text-black">
              Dodaj nowy przychód lub wydatek.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2 px-5 pb-5 pt-1">
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
              <DatePicker
                value={date}
                onChange={(v) => setDate(v)}
                placeholder="Wybierz datę"
                fromYear={2000}
                maxDate={getLastDayOfMonth()}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-0 !bg-[#c4a2efff] !text-black hover:!bg-[#7ecfff]"
                  style={{ backgroundColor: "#caa5fcff", color: "#000000" }}
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
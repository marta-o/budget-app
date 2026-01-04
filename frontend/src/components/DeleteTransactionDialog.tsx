/**
 * DeleteTransactionDialog - Confirmation dialog for deleting transactions.
 * Shows a warning message and requires user confirmation before deletion.
 */
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";

interface DeleteTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteTransactionDialog({ open, onOpenChange, onConfirm }: DeleteTransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg rounded-xl shadow-2xl p-0 bg-white/40 backdrop-blur-2xl border border-white/30 text-gray-900">

        <DialogHeader className="text-center pb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl">
          <DialogTitle className="text-xl font-semibold tracking-tight text-black">
            Usuń transakcję
          </DialogTitle>
          <DialogDescription className="text-sm opacity-90 text-black">
            Na pewno chcesz usunąć tę transakcję? <br /> Operacji nie będzie można cofnąć.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 pt-4 flex justify-end gap-2 mt-4">
          <DialogClose asChild>
            <Button
              variant="ghost"
              type="button"
              style={{ backgroundColor: "#caa5fc", color: "#000000" }}
            >
              Anuluj
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            type="button"
            style={{ backgroundColor: "#ffffff", color: "#000000" }}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Usuń
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
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
      <DialogContent className="max-w-sm bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle>Usuń transakcję</DialogTitle>
          <DialogDescription>Na pewno chcesz usunąć tę transakcję? Operacji nie będzie można cofnąć.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <DialogClose asChild>
            <Button variant="ghost" type="button">Anuluj</Button>
          </DialogClose>
          <Button
            variant="destructive"
            type="button"
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
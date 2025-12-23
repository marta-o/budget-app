import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { pl } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function DatePicker({ value, onChange, placeholder = "Wybierz datę ", label }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  
  const selected = useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <span className="text-sm font-semibold text-[#6c4dd4]">{label}</span>
      ) : null}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="w-40 justify-between inline-flex items-center rounded-md border px-3 py-2 text-sm bg-white text-gray-900 shadow-sm focus:outline-none focus-visible:outline-none focus-visible:ring-0"
          >
            <span className="text-gray-900">{selected ? selected.toLocaleDateString("pl-PL") : placeholder}</span>
            <CalendarIcon className="w-4 h-4 text-black ml-4" aria-hidden />
          </button>
        </Popover.Trigger>
        <Popover.Content
          side="bottom"
          align="start"
          className="rounded-xl border bg-white p-2 shadow-xl z-50"
          style={{ borderColor: "#dec5feff", backgroundColor: "#ffffff" }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day && onChange) {
                const year = day.getFullYear();
                const month = String(day.getMonth() + 1).padStart(2, '0');
                const dayNum = String(day.getDate()).padStart(2, '0');
                const iso = `${year}-${month}-${dayNum}`;
                onChange(iso);
                setOpen(false);
              }
            }}
            weekStartsOn={1}
            locale={pl}
            className="bg-white rounded-lg"
            styles={{
              root: { backgroundColor: "#ffffff" },
              head_cell: { color: "#c29cf3ff" },
              day: { color: "#4b5563" },
            }}
            modifiersStyles={{
              selected: { backgroundColor: "#dec5feff", color: "#1f2937" },
              today: { color: "#361ea0ff", fontWeight: 600 },
            }}
          />
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { pl } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  fromYear?: number;
  toYear?: number;
  maxDate?: Date;
}

export function DatePicker({ value, onChange, placeholder = "Wybierz datę ", label, fromYear = 2000, toYear = new Date().getFullYear(), maxDate }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"day" | "year" | "month" | "customYear">("day");
  const [customYearInput, setCustomYearInput] = useState<string>("");

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  
  // Use maxDate if provided, otherwise use today
  const disabledAfter = useMemo(() => {
    if (maxDate) return maxDate;
    return today;
  }, [maxDate, today]);

  const selected = useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  const [month, setMonth] = useState<Date>(selected ?? new Date());

  const monthLabel = `${month.toLocaleString("pl-PL", { month: "long" })} ${month.getFullYear()}`;

  const years = useMemo(() => {
    const maxYear = Math.min(toYear, currentYear);
    const list: number[] = [];
    for (let y = maxYear; y >= fromYear; y -= 1) list.push(y); // aktualny u góry
    return list;
  }, [fromYear, toYear, currentYear]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ label: new Date(2000, i, 1).toLocaleString("pl-PL", { month: "long" }), value: i })),
    [],
  );

  const closeAndReset = () => {
    setView("day");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <span className="text-sm font-semibold text-[#6c4dd4]">{label}</span>
      ) : null}
      <Popover.Root
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (v) {
            setView("day");
            setMonth(selected ?? new Date());
          }
        }}
      >
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
          style={{ borderColor: "#dec5fe", backgroundColor: "#ffffff", height: "350px", width: "330px" }}
        >
          <div className="flex items-center justify-between px-2 pb-9">
            <button
              type="button"
              className="text-lg font-semibold text-[#361ea0ff] flex items-center gap-2 cursor-pointer hover:opacity-70"
              onClick={() => setView(view === "day" ? "year" : "day")}
            >
              {monthLabel}
              {view === "day" && <ChevronDown className="w-4 h-4" aria-hidden />}
            </button>
            <div className="flex items-center gap-2">
              {view === "day" && (
                <>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-slate-100"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    aria-label="Poprzedni miesiąc"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={month.getFullYear() === currentYear && month.getMonth() >= currentMonthIndex}
                    onClick={() => {
                      if (month.getFullYear() === currentYear && month.getMonth() >= currentMonthIndex) return;
                      setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
                    }}
                    aria-label="Następny miesiąc"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </button>
                </>
              )}
              {view !== "day" ? (
                <button
                  type="button"
                  className="text-xs text-slate-500 underline"
                  onClick={() => setView("day")}
                >
                  Wróć do dni
                </button>
              ) : null}
            </div>
          </div>

          {view === "year" && (
            <div className="grid grid-cols-4 gap-1.5 p-2 min-h-[240px] overflow-y-auto max-h-[270px]">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`rounded-md border px-2.5 py-1.5 text-sm ${y === month.getFullYear() ? "bg-[#dec5feff] text-[#1f2937]" : "bg-white"}`}                  style={y === month.getFullYear() ? { backgroundColor: "#dec5fe" } : {}}
                  onClick={() => {
                    setMonth(new Date(y, Math.min(month.getMonth(), y === currentYear ? currentMonthIndex : 11), 1));
                    setView("month");
                  }}
                >
                  {y}
                </button>
              ))}
              <button
                type="button"
                className="rounded-md px-2.5 py-1.5 text-sm bg-[#dec5feff] text-[#1f2937] hover:bg-[#b983ff]"
                style={{ border: "2px solid #dec5feff" }}
                onClick={() => {
                  setView("customYear");
                  setCustomYearInput("");
                }}
              >
                Inny
              </button>
            </div>
          )}

          {view === "customYear" && (
            <div className="p-2 flex flex-col gap-2 min-h-[240px]">
              <input
                type="number"
                min="1900"
                max={fromYear - 1}
                placeholder="Wpisz rok"
                value={customYearInput}
                onChange={(e) => setCustomYearInput(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const y = parseInt(customYearInput, 10);
                    if (!isNaN(y) && y < fromYear && y >= 1900) {
                      setMonth(new Date(y, Math.min(month.getMonth(), currentMonthIndex), 1));
                      setView("month");
                      setCustomYearInput("");
                    }
                  }}
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  style={{ backgroundColor: "#dec5fe" }}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView("year");
                    setCustomYearInput("");
                  }}
                  className="flex-1 rounded-md border px-3 py-2 text-sm bg-white hover:bg-slate-100"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}

          {view === "month" && (
            <div className="grid grid-cols-3 gap-2 p-2 min-h-[240px]">
              {months.map((m) => {
                const disabled = month.getFullYear() === currentYear && m.value > currentMonthIndex;
                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={disabled}
                    className={`rounded-md border px-3 py-2 text-sm capitalize ${m.value === month.getMonth() ? "text-gray-800" : "bg-white"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    style={m.value === month.getMonth() ? { backgroundColor: "#dec5fe" } : {}}
                    onClick={() => {
                      if (disabled) return;
                      setMonth(new Date(month.getFullYear(), m.value, 1));
                      setView("day");
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}

          {view === "day" && (
            <DayPicker
              mode="single"
              selected={selected}
              month={month}
              onMonthChange={(m) => {
                const maxMonthDate = new Date(currentYear, currentMonthIndex, 1);
                if (m > maxMonthDate) {
                  setMonth(maxMonthDate);
                } else {
                  setMonth(m);
                }
              }}
              components={{ Caption: () => null, CaptionLabel: () => null }}
              onSelect={(day) => {
                if (day && onChange) {
                  const year = day.getFullYear();
                  const mm = String(day.getMonth() + 1).padStart(2, "0");
                  const dayNum = String(day.getDate()).padStart(2, "0");
                  const iso = `${year}-${mm}-${dayNum}`;
                  onChange(iso);
                  closeAndReset();
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
                selected: { backgroundColor: "#dec5fe", color: "#1f2937" },
                today: { color: "#361ea0ff", fontWeight: 600 },
              }}
              disabled={{ after: disabledAfter }}
            />
          )}
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
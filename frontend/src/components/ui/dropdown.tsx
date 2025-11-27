import React, { useEffect, useRef, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string | string[];
  options: Option[];
  onChange: (v: string | string[]) => void;
  className?: string;
  placeholder?: string;
  multi?: boolean;
}

export function Dropdown({ value, options, onChange, className = '', placeholder, multi = false }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const [hovered, setHovered] = useState<string | null>(null);

  const selected = (() => {
    if (multi) {
      const vals = Array.isArray(value) ? value : [];
      const labels = options.filter(o => vals.includes(o.value)).map(o => o.label);
      if (labels.length === 0) return (placeholder ?? '');
      if (labels.length > 2) return `${labels.length} wybrano`;
      return labels.join(', ');
    }
    return options.find(o => o.value === (value as string))?.label ?? placeholder ?? '';
  })();

  return (
    <div ref={ref} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-3 py-2 border border-slate-300 rounded-md bg-white shadow-sm flex items-center justify-between gap-2"
        style={{ minWidth: '10rem' }}
      >
        <span className="truncate text-sm">{selected}</span>
        <svg className="w-5 h-5 text-slate-500" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute mt-1 w-full border border-slate-200 rounded-md shadow-lg max-h-48 overflow-auto py-1"
          style={{ backgroundColor: '#ffffff', zIndex: 9999 }}
        >
          {options.map(o => {
            const isHovered = hovered === o.value;
            const isSelected = multi ? (Array.isArray(value) && value.includes(o.value)) : (o.value === value);
            // darker gray for selected in multi mode, otherwise subtle
            const bg = isSelected ? (multi ? '#d1d5db' : '#f1f5f9') : isHovered ? '#e6f0ff' : undefined;
            const color = isHovered || isSelected ? '#0f172a' : undefined;

            const onItemClick = () => {
              if (multi) {
                const arr = Array.isArray(value) ? [...value] : [];
                const idx = arr.indexOf(o.value);
                if (idx >= 0) arr.splice(idx, 1);
                else arr.push(o.value);
                onChange(arr);
              } else {
                onChange(o.value);
                setOpen(false);
              }
            };

            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onClick={onItemClick}
                onMouseEnter={() => setHovered(o.value)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer transition-colors duration-150 ${isSelected ? 'font-medium' : ''}`}
                style={{ backgroundColor: bg, color }}
              >
                {multi && (
                  <input type="checkbox" readOnly checked={!!isSelected} className="w-4 h-4" />
                )}
                <span className="truncate block min-w-0">{o.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Dropdown;

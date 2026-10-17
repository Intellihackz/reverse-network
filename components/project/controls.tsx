import { cn } from "@/lib/utils";

const label = "block text-sm font-semibold text-zinc-800";

export const SWATCHES = ["#111111", "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#16a34a", "#0891b2"];

export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className={label}>{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="mt-2 flex rounded-full bg-zinc-100 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
              value === o.value ? "bg-zinc-950 text-white" : "text-zinc-600 hover:text-zinc-950",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

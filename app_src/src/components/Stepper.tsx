import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Review", "Travellers", "Seats", "Meals", "Payment"];

export function Stepper({ current }: { current: number }) {
  return (
    <div className="mx-auto max-w-3xl px-2">
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors",
                    done ? "bg-emerald-500 text-white" : active ? "bg-brand text-white ring-4 ring-brand/20" : "bg-slate-200 text-slate-500"
                  )}
                >
                  {done ? <Check size={16} /> : i + 1}
                </div>
                <span className={cn("hidden text-[11px] font-medium sm:block", active ? "text-brand" : "text-slate-500")}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("mx-1 h-0.5 flex-1 sm:mx-2", done ? "bg-emerald-500" : "bg-slate-200")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { AIRLINES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AirlineLogo({ code, size = 36, className }: { code: string; size?: number; className?: string }) {
  const airline = AIRLINES.find((a) => a.code === code);
  const color = airline?.color || "#0b63d6";
  return (
    <div
      className={cn("grid place-items-center rounded-lg font-bold text-white shrink-0", className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
      title={airline?.name || code}
    >
      {code}
    </div>
  );
}

import { sourceMeta } from "@/lib/flight-source";
import { cn } from "@/lib/utils";

/**
 * "AK" / "AM" chip marking which supplier ticketed an itinerary — Akbar or
 * Amadeus. The client asked for this on the search results and on the booking,
 * so staff can tell at a glance where a fare came from.
 *
 * The short code is all that ever goes on screen. The client asked for the
 * supplier's name to stay off customer-facing pages, so nothing here — not even
 * the tooltip — spells it out; the admin console is where names are shown.
 *
 * Renders nothing when the supplier is unknown (hotel/bus bookings, or an old
 * flight booking saved before this was recorded).
 */
export function FlightSourceBadge({ source, className }: { source?: unknown; className?: string }) {
  const meta = sourceMeta(source);
  if (!meta) return null;
  return (
    <span
      title={`Booked from ${meta.code}`}
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-[3px] text-[11px] font-bold uppercase leading-none tracking-wide ring-1",
        meta.cls,
        className
      )}
    >
      {meta.code}
    </span>
  );
}

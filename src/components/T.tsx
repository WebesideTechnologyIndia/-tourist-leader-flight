"use client";
import { useT } from "@/store/preferences";

/** Reactive translated text — usable inside server components to switch language. */
export function T({ k }: { k: string }) {
  const t = useT();
  return <>{t(k)}</>;
}

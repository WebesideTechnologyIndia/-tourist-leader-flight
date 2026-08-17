"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, ImageIcon, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageUpload({ value, onChange, folder = "uploads", presets = [] }: { value: string; onChange: (url: string) => void; folder?: string; presets?: string[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setError(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok && d.url) onChange(d.url);
      else setError(d.error || "Upload failed");
    } catch { setError("Network error"); } finally { setUploading(false); }
  };

  return (
    <div>
      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {value ? (
            <>
              <Image src={value} alt="" fill sizes="128px" className="object-cover" />
              <button type="button" onClick={() => onChange("")} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900"><X size={13} /></button>
            </>
          ) : (
            <span className="flex h-full w-full items-center justify-center text-slate-300"><ImageIcon size={26} /></span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {uploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Upload size={15} /> Upload image</>}
          </button>
          <p className="mt-1.5 text-xs text-slate-400">JPG, PNG, WebP, AVIF or GIF · up to 5 MB</p>
          <div className="mt-2 flex items-center gap-2">
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL / path" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand" />
          </div>
        </div>
      </div>

      {presets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="self-center text-[11px] font-semibold text-slate-400">Presets:</span>
          {presets.map((p) => (
            <button type="button" key={p} onClick={() => onChange(p)} className={cn("relative h-9 w-12 overflow-hidden rounded-md ring-2", value === p ? "ring-brand" : "ring-transparent hover:ring-slate-300")}>
              <Image src={p} alt="" fill sizes="48px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600"><AlertCircle size={13} /> {error}</p>}
    </div>
  );
}

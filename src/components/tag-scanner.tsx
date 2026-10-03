"use client";

import { useId, useRef, useState } from "react";
import { Camera, ChevronDown, Image as ImageIcon, Keyboard, Loader2, Plus, Trash2, X } from "lucide-react";
import { formatINR } from "@/lib/money";
import { toSizeSet } from "@/lib/sets";
import type { ArticleSize, TagExtract } from "@/lib/types";

type Row = { key: string; sizes: string; rate: string };
type Stored = { url: string; driveFileId: string; driveWebLink: string };

type Draft = {
  supplierName: string;
  supplierPhone: string;
  supplierGstin: string;
  supplierEmail: string;
  supplierAddress: string;
  designNo: string;
  brand: string;
  fabric: string;
  gsm: string;
  color: string;
  remarks: string;
};

const EMPTY: Draft = {
  supplierName: "",
  supplierPhone: "",
  supplierGstin: "",
  supplierEmail: "",
  supplierAddress: "",
  designNo: "",
  brand: "",
  fabric: "",
  gsm: "",
  color: "",
  remarks: "",
};

let seq = 0;
const key = () => `r${seq++}`;

const DEFAULT_ROWS = (): Row[] => [
  { key: key(), sizes: "22/24/26/28", rate: "" },
  { key: key(), sizes: "30/32/34/36", rate: "" },
];

export type SavedTag = { tagId: string; sizes: ArticleSize[] };

/**
 * Photo of a supplier tag -> the AI reads it -> the user checks the boxes -> the
 * article is saved in the backend. onSaved receives the saved size sets with rates.
 */
export function TagScanner({ onSaved, saveLabel }: { onSaved: (saved: SavedTag) => void; saveLabel: string }) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const uid = useId();

  const [preview, setPreview] = useState<string | null>(null);
  const [stored, setStored] = useState<Stored | null>(null);
  const [manual, setManual] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);

  const open = stored !== null || manual;

  function reset() {
    setPreview(null);
    setStored(null);
    setManual(false);
    setNotice(null);
    setError(null);
    setWarnings([]);
    setDraft(EMPTY);
    setRows(DEFAULT_ROWS());
    setMoreOpen(false);
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setPreview(URL.createObjectURL(file));
    setReading(true);
    setStored(null);
    setManual(false);

    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/scan", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The photo could not be uploaded.");
        return;
      }
      setStored(data.stored as Stored);
      const x = data.extract as TagExtract;
      setDraft({
        supplierName: x.supplierName,
        supplierPhone: x.supplierPhone,
        supplierGstin: x.supplierGstin ?? "",
        supplierEmail: x.supplierEmail,
        supplierAddress: x.supplierAddress,
        designNo: x.designNo,
        brand: x.brand,
        fabric: x.fabric,
        gsm: x.gsm,
        color: x.color,
        remarks: x.remarks,
      });
      const fromTag = x.sizeRates.map((g) => ({ key: key(), sizes: g.sizes.join("/"), rate: String(g.rate || "") }));
      setRows(fromTag.length > 0 ? fromTag : DEFAULT_ROWS());
      const lowConfidence = x.confidence !== "high" ? ["Handwriting wasn't fully clear — please check each box."] : [];
      setWarnings([...lowConfidence, ...(x.warnings ?? [])]);
      if (data.error) setNotice(data.error as string);
    } catch {
      setError("Couldn't reach the server. Check your internet and try again.");
    } finally {
      setReading(false);
      if (cameraInput.current) cameraInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
    }
  }

  function set<K extends keyof Draft>(k: K, v: string) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function setRow(k: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)));
  }

  async function save() {
    setError(null);
    const filled = rows.filter((r) => r.sizes.trim() !== "" && Number(r.rate) > 0);
    if (!draft.designNo.trim()) return setError("Enter the article code.");
    if (!draft.supplierName.trim()) return setError("Enter the supplier name.");
    if (filled.length === 0) return setError("Enter the rate for at least one size.");

    setSaving(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          imageUrl: stored?.url ?? "",
          driveFileId: stored?.driveFileId ?? "",
          driveWebLink: stored?.driveWebLink ?? "",
          sets: filled.map((r) => ({ sizes: r.sizes.trim(), rate: Number(r.rate) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save this tag.");
        return;
      }
      onSaved(data as SavedTag);
      reset();
    } catch {
      setError("Could not reach the server while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />

      {!open && !reading && (
        <>
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-2xl bg-accent-soft px-4 py-10 transition active:scale-[0.99]"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-sm">
              <Camera size={30} strokeWidth={1.8} />
            </span>
            <span className="text-lg font-bold">Open camera</span>
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => galleryInput.current?.click()} className="btn btn-outline btn-sm">
              <ImageIcon size={18} /> Gallery
            </button>
            <button type="button" onClick={() => setManual(true)} className="btn btn-outline btn-sm">
              <Keyboard size={18} /> Type
            </button>
          </div>
          {error && <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-base text-accent">{error}</p>}
        </>
      )}

      {reading && (
        <div className="flex items-center gap-4 rounded-2xl border border-line p-3">
          {preview && (
            // Blob preview of the just-picked file, so plain img rather than next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Tag photo" className="h-24 w-20 shrink-0 rounded-xl object-cover" />
          )}
          <div className="flex items-center gap-2.5 font-semibold">
            <Loader2 className="animate-spin text-accent" size={24} />
            <span>
              Reading the tag…
              <span className="block text-sm font-normal text-muted">About 10 seconds</span>
            </span>
          </div>
        </div>
      )}

      {open && !reading && (
        <div className="rise space-y-4">
          <div className="flex items-center gap-3">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Tag photo" className="h-16 w-14 shrink-0 rounded-xl border border-line object-cover" />
            )}
            <p className="flex-1 font-semibold">{stored ? "Check and save" : "Type the tag details"}</p>
            <button type="button" onClick={reset} className="btn btn-outline px-3" aria-label="Start over">
              <X size={18} />
            </button>
          </div>

          {warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">
              {warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
          {notice && <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">{notice}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`${uid}-code`} label="Article code" value={draft.designNo} onChange={(v) => set("designNo", v)} placeholder="KW-1170" />
            <Field id={`${uid}-sup`} label="Supplier" value={draft.supplierName} onChange={(v) => set("supplierName", v)} />
            <Field id={`${uid}-brand`} label="Brand" value={draft.brand} onChange={(v) => set("brand", v)} />
            <Field id={`${uid}-fabric`} label="Fabric" value={draft.fabric} onChange={(v) => set("fabric", v)} />
          </div>

          <div>
            <p className="label">Sizes &amp; rate per piece</p>
            <div className="space-y-2">
              {rows.map((r, idx) => {
                const s = toSizeSet(r.sizes);
                const rate = Number(r.rate) || 0;
                return (
                  <div key={r.key} className="rounded-xl border border-line p-2.5">
                    <div className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
                      <input
                        id={`${uid}-${idx}-s`}
                        aria-label="Sizes"
                        className="field"
                        value={r.sizes}
                        onChange={(e) => setRow(r.key, { sizes: e.target.value })}
                        placeholder="22/24/26/28"
                      />
                      <input
                        id={`${uid}-${idx}-r`}
                        aria-label="Rate per piece"
                        className="field tnum"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={r.rate}
                        onChange={(e) => setRow(r.key, { rate: e.target.value })}
                        placeholder="₹ rate"
                      />
                      <button
                        type="button"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                        className="btn btn-outline px-3"
                        aria-label="Remove size row"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {s.label && (
                      <p className="mt-1.5 text-sm text-muted">
                        Set <b className="text-foreground">{s.label}</b> · 1 set = {s.pcsPerSet} pcs
                        {rate > 0 && <> · {formatINR(rate * s.pcsPerSet)}</>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, { key: key(), sizes: "", rate: "" }])}
              className="btn btn-outline btn-sm mt-2"
            >
              <Plus size={16} /> Add size
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="flex items-center gap-1.5 text-base font-semibold text-accent"
          >
            <ChevronDown size={18} className={moreOpen ? "rotate-180" : ""} />
            {moreOpen ? "Hide" : "More details"}
          </button>
          {moreOpen && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id={`${uid}-phone`} label="Supplier phone" value={draft.supplierPhone} onChange={(v) => set("supplierPhone", v)} />
              <Field id={`${uid}-gst`} label="Supplier GST number" value={draft.supplierGstin} onChange={(v) => set("supplierGstin", v.toUpperCase())} />
              <Field id={`${uid}-email`} label="Supplier email" value={draft.supplierEmail} onChange={(v) => set("supplierEmail", v)} />
              <Field id={`${uid}-gsm`} label="GSM" value={draft.gsm} onChange={(v) => set("gsm", v)} />
              <Field id={`${uid}-color`} label="Colour" value={draft.color} onChange={(v) => set("color", v)} />
              <Field id={`${uid}-rem`} label="Remarks" value={draft.remarks} onChange={(v) => set("remarks", v)} />
              <div className="sm:col-span-2">
                <Field id={`${uid}-addr`} label="Supplier address" value={draft.supplierAddress} onChange={(v) => set("supplierAddress", v)} />
              </div>
            </div>
          )}

          {error && <p className="rounded-xl bg-accent-soft px-3 py-2 text-base text-accent">{error}</p>}

          <button type="button" onClick={save} disabled={saving} className="btn btn-primary btn-lg w-full">
            {saving && <Loader2 className="animate-spin" size={18} />}
            {saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, CheckCheck, Images, Loader2, Plus, RotateCw, Trash2, X } from "lucide-react";
import type { ArticleSize, TagExtract } from "@/lib/types";

type Row = { key: string; sizes: string; rate: string; picked: boolean };

type Card = {
  key: string;
  file: File;
  preview: string;
  status: "waiting" | "reading" | "ready" | "error";
  error?: string;
  selected: boolean;
  saved: boolean;
  confidence?: TagExtract["confidence"];
  warnings: string[];
  designNo: string;
  supplierName: string;
  supplierPhone: string;
  supplierGstin: string;
  supplierAddress: string;
  supplierEmail: string;
  brand: string;
  fabric: string;
  gsm: string;
  color: string;
  rows: Row[];
};

let seq = 0;
const key = () => `t${seq++}`;
const code = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");
const PARALLEL = 3;

function blankCard(file: File): Card {
  return {
    key: key(),
    file,
    preview: URL.createObjectURL(file),
    status: "waiting",
    selected: true,
    saved: false,
    warnings: [],
    designNo: "",
    supplierName: "",
    supplierPhone: "",
    supplierGstin: "",
    supplierAddress: "",
    supplierEmail: "",
    brand: "",
    fabric: "",
    gsm: "",
    color: "",
    rows: [],
  };
}

/** Size chart rows for a card: what the tag shows, falling back to the article as saved before. */
function rowsFor(x: TagExtract, saved: ArticleSize[]): Row[] {
  const read = x.sizeRates.filter((r) => r.sizes.length > 0).map((r) => ({ key: key(), sizes: r.sizes.join("/"), rate: r.rate ? String(r.rate) : "", picked: true }));
  if (read.length) return read;
  if (saved.length) return saved.map((z) => ({ key: key(), sizes: z.sizes || z.size, rate: z.rate ? String(z.rate) : "", picked: true }));
  return [{ key: key(), sizes: "", rate: "", picked: true }];
}

/**
 * Scan many tags back to back (camera) or pick many photos at once (gallery). Each tag becomes a
 * card with its detected size chart; ticked articles and size rows are saved and handed to onAdd.
 */
export function TagTray({ catalog, onAdd }: { catalog: ArticleSize[]; onAdd: (sizes: ArticleSize[]) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardsRef = useRef(cards);
  const inFlight = useRef(0);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  function patch(k: string, p: Partial<Card>) {
    setCards((cs) => cs.map((c) => (c.key === k ? { ...c, ...p } : c)));
  }

  function patchRow(k: string, rk: string, p: Partial<Row>) {
    setCards((cs) => cs.map((c) => (c.key === k ? { ...c, rows: c.rows.map((r) => (r.key === rk ? { ...r, ...p } : r)) } : c)));
  }

  async function read(card: Card) {
    patch(card.key, { status: "reading", error: undefined });
    try {
      const body = new FormData();
      body.append("image", card.file);
      body.append("store", "0");
      const res = await fetch("/api/scan", { method: "POST", body });
      const data = await res.json();
      const x = data.extract as TagExtract | undefined;
      if (!res.ok || !x) {
        patch(card.key, { status: "error", error: data.error ?? "Could not read this tag." });
        return;
      }
      const saved = x.designNo ? catalog.filter((z) => code(z.articleCode) === code(x.designNo)) : [];
      patch(card.key, {
        status: "ready",
        error: x.designNo ? undefined : "Article code not read. Type it in.",
        confidence: x.confidence,
        warnings: x.warnings ?? [],
        designNo: x.designNo || saved[0]?.articleCode || "",
        supplierName: x.supplierName || saved[0]?.supplierName || "",
        supplierPhone: x.supplierPhone,
        supplierGstin: x.supplierGstin ?? "",
        supplierAddress: x.supplierAddress,
        supplierEmail: x.supplierEmail,
        brand: x.brand || saved[0]?.brand || "",
        fabric: x.fabric || saved[0]?.fabric || "",
        gsm: x.gsm,
        color: x.color,
        rows: rowsFor(x, saved),
      });
    } catch {
      patch(card.key, { status: "error", error: "Could not reach the server. Check your internet." });
    } finally {
      inFlight.current -= 1;
      pump();
    }
  }

  /** Reads waiting cards, a few at a time, so a stack of photos does not overload the phone or the API. */
  function pump() {
    while (inFlight.current < PARALLEL) {
      const next = cardsRef.current.find((c) => c.status === "waiting");
      if (!next) return;
      inFlight.current += 1;
      cardsRef.current = cardsRef.current.map((c) => (c.key === next.key ? { ...c, status: "reading" } : c));
      void read(next);
    }
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const fresh = [...list].filter((f) => f.type.startsWith("image/")).map(blankCard);
    cardsRef.current = [...fresh, ...cardsRef.current];
    setCards(cardsRef.current);
    pump();
    if (camera.current) camera.current.value = "";
    if (gallery.current) gallery.current.value = "";
  }

  function remove(k: string) {
    setCards((cs) => cs.filter((c) => c.key !== k));
  }

  const ready = cards.filter((c) => c.status === "ready" && !c.saved);
  const chosen = ready.filter((c) => c.selected && c.rows.some((r) => r.picked));
  const reading = cards.filter((c) => c.status === "reading" || c.status === "waiting").length;
  const allSelected = ready.length > 0 && ready.every((c) => c.selected);

  async function addSelected() {
    setError(null);
    const missing = chosen.find((c) => !c.designNo.trim());
    if (missing) return setError("Every ticked tag needs an article code.");
    const noRows = chosen.find((c) => c.rows.filter((r) => r.picked).some((r) => !r.sizes.trim()));
    if (noRows) return setError(`Fill in the sizes for ${noRows.designNo}.`);
    setAdding(true);
    const added: ArticleSize[] = [];
    try {
      for (const c of chosen) {
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierName: c.supplierName.trim() || "Unknown supplier",
            supplierAddress: c.supplierAddress,
            supplierPhone: c.supplierPhone,
            supplierEmail: c.supplierEmail,
            supplierGstin: c.supplierGstin,
            brand: c.brand,
            designNo: c.designNo.trim().replace(/[.\s]+$/, ""),
            fabric: c.fabric,
            gsm: c.gsm,
            color: c.color,
            remarks: "",
            sets: c.rows.filter((r) => r.picked).map((r) => ({ sizes: r.sizes.trim(), rate: Number(r.rate) || 0 })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(`${c.designNo}: ${data.error ?? "could not be saved."}`);
          continue;
        }
        added.push(...(data.sizes as ArticleSize[]));
        patch(c.key, { saved: true });
      }
      if (added.length) onAdd(added);
    } catch {
      setError("Could not reach the server while adding.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <input ref={gallery} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button type="button" onClick={() => camera.current?.click()} className="btn btn-primary btn-lg">
          <Camera size={20} /> {cards.length ? "Scan next tag" : "Scan tags"}
        </button>
        <button type="button" onClick={() => gallery.current?.click()} className="btn btn-outline btn-lg" aria-label="Pick several photos">
          <Images size={20} /> <span className="hidden sm:inline">Photos</span>
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted">Scan one tag after another, or pick many photos at once.</p>

      {cards.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold">
              Scanned {cards.length}
              {reading > 0 && <span className="ml-2 font-semibold text-accent">· reading {reading}…</span>}
            </p>
            {ready.length > 1 && (
              <button type="button" onClick={() => setCards((cs) => cs.map((c) => (c.status === "ready" && !c.saved ? { ...c, selected: !allSelected } : c)))} className="inline-flex items-center gap-1 text-sm font-bold text-accent">
                <CheckCheck size={16} /> {allSelected ? "Untick all" : "Tick all"}
              </button>
            )}
          </div>

          <ul className="space-y-3">
            {cards.map((c) => (
              <li key={c.key} className={`rise rounded-2xl border p-3 transition-colors ${c.saved ? "border-ok/30 bg-ok-soft/40" : c.selected && c.status === "ready" ? "border-accent/50 bg-accent-soft/30" : "border-line bg-surface"}`}>
                <div className="flex items-start gap-3">
                  {c.status === "ready" && !c.saved ? (
                    <button
                      type="button"
                      onClick={() => patch(c.key, { selected: !c.selected })}
                      className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${c.selected ? "border-accent bg-accent text-white" : "border-line bg-surface"}`}
                      aria-label={c.selected ? "Untick this tag" : "Tick this tag"}
                    >
                      {c.selected && <Check size={14} strokeWidth={3} />}
                    </button>
                  ) : (
                    <span className="mt-1 h-6 w-6 shrink-0" />
                  )}
                  {/* Blob preview of the picked photo. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.preview} alt="" className="h-16 w-12 shrink-0 rounded-lg bg-background object-cover" />
                  <div className="min-w-0 flex-1">
                    {c.status === "waiting" || c.status === "reading" ? (
                      <p className="flex items-center gap-2 pt-4 text-sm font-semibold text-muted">
                        <Loader2 size={16} className="animate-spin text-accent" /> {c.status === "waiting" ? "Waiting…" : "Reading the tag…"}
                      </p>
                    ) : c.status === "error" ? (
                      <div className="pt-1">
                        <p className="text-sm font-semibold text-danger">{c.error}</p>
                        <button type="button" onClick={() => { patch(c.key, { status: "waiting" }); cardsRef.current = cardsRef.current.map((x) => (x.key === c.key ? { ...x, status: "waiting" } : x)); pump(); }} className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-accent">
                          <RotateCw size={14} /> Try again
                        </button>
                      </div>
                    ) : (
                      <div className="pt-0.5">
                        <p className="truncate text-base font-extrabold">{c.designNo || "Article code?"}</p>
                        <p className="truncate text-xs text-muted">{[c.brand, c.supplierName].filter(Boolean).join(" · ") || "Supplier not read"}</p>
                        <p className="mt-1 text-xs font-semibold text-accent tnum">
                          {c.rows.filter((r) => r.picked).length} of {c.rows.length} size row{c.rows.length === 1 ? "" : "s"} ticked
                        </p>
                      </div>
                    )}
                  </div>
                  {!c.saved && (
                    <button type="button" onClick={() => remove(c.key)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remove this tag">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {c.status === "ready" && (
                  <div className="mt-3">
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <label className="block min-w-0">
                        <span className="mb-1 block text-xs font-semibold text-muted">Article code</span>
                        <input className="field h-10 min-h-0 py-1 font-extrabold" value={c.designNo} onChange={(e) => patch(c.key, { designNo: e.target.value })} disabled={c.saved} aria-label="Article code" />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-1 block text-xs font-semibold text-muted">Brand</span>
                        <input className="field h-10 min-h-0 py-1 text-sm" value={c.brand} onChange={(e) => patch(c.key, { brand: e.target.value })} disabled={c.saved} aria-label="Brand" />
                      </label>
                      <label className="col-span-2 block min-w-0">
                        <span className="mb-1 block text-xs font-semibold text-muted">Supplier</span>
                        <input className="field h-10 min-h-0 py-1 text-sm" value={c.supplierName} onChange={(e) => patch(c.key, { supplierName: e.target.value })} disabled={c.saved} aria-label="Supplier" />
                      </label>
                    </div>
                    <p className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted">
                      Size chart
                      {c.saved && <span className="inline-flex items-center gap-1 normal-case tracking-normal text-ok"><Check size={14} /> Added to order</span>}
                    </p>
                    <div className="space-y-1.5">
                      {c.rows.map((r) => (
                        <div key={r.key} className="grid grid-cols-[auto_1fr_5rem_auto] items-center gap-1.5">
                          <button
                            type="button"
                            disabled={c.saved}
                            onClick={() => patchRow(c.key, r.key, { picked: !r.picked })}
                            className={`grid h-5 w-5 place-items-center rounded border-2 ${r.picked ? "border-accent bg-accent text-white" : "border-line"}`}
                            aria-label={r.picked ? "Leave out this size row" : "Include this size row"}
                          >
                            {r.picked && <Check size={12} strokeWidth={3} />}
                          </button>
                          <input className="field h-9 min-h-0 py-1 text-sm tnum" placeholder="22/24/26/28 or M/L/XL" value={r.sizes} onChange={(e) => patchRow(c.key, r.key, { sizes: e.target.value })} disabled={c.saved} aria-label="Sizes" />
                          <span className="relative">
                            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs font-semibold text-muted">₹</span>
                            <input className="field h-9 min-h-0 py-1 pl-6 text-sm tnum" type="number" inputMode="decimal" min="0" placeholder="Rate" value={r.rate} onChange={(e) => patchRow(c.key, r.key, { rate: e.target.value })} disabled={c.saved} aria-label="Rate per piece" />
                          </span>
                          <button type="button" disabled={c.saved} onClick={() => setCards((cs) => cs.map((x) => (x.key === c.key ? { ...x, rows: x.rows.filter((y) => y.key !== r.key) } : x)))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-danger disabled:opacity-30" aria-label="Delete size row">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {!c.saved && (
                      <button type="button" onClick={() => patch(c.key, { rows: [...c.rows, { key: key(), sizes: "", rate: "", picked: true }] })} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent">
                        <Plus size={14} /> Add size row
                      </button>
                    )}
                    {(c.confidence && c.confidence !== "high") || c.warnings.length > 0 || c.error ? (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warn-soft px-2.5 py-1.5 text-xs font-medium text-warn">
                        <AlertTriangle size={13} className="mt-px shrink-0" /> {c.error ?? (c.warnings[0] || "Handwriting was unclear. Check the code and rates.")}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {error && <p className="alert-error mt-3">{error}</p>}
          {chosen.length > 0 && (
            <button type="button" onClick={addSelected} disabled={adding} className="btn btn-primary mt-3 w-full">
              {adding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Add {chosen.length} article{chosen.length === 1 ? "" : "s"} to order
            </button>
          )}
        </div>
      )}
    </div>
  );
}

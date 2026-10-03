"use client";

import { useState } from "react";
import { Download, Loader2, MessageCircle, Printer, Share2 } from "lucide-react";
import { billPdf, orderPdf, supplierPdf } from "@/lib/pdf";
import { billMessage, orderMessage, supplierMessage } from "@/lib/messages";
import { downloadBlob, sharePdf, whatsappUrl } from "@/lib/share";
import type { Bill, BillItem, Order, OrderItem, ShopInfo } from "@/lib/types";
import type { SupplierDay } from "@/lib/store/data";

export type Doc =
  | { kind: "order"; order: Order; items: OrderItem[] }
  | { kind: "bill"; bill: Bill; items: BillItem[] }
  | { kind: "supplier"; day: string; suppliers: SupplierDay[]; compiledAt: string };

async function build(shop: ShopInfo, doc: Doc) {
  if (doc.kind === "order") return orderPdf(shop, doc.order, doc.items);
  if (doc.kind === "bill") return billPdf(shop, doc.bill, doc.items);
  return supplierPdf(shop, doc.day, doc.suppliers, doc.compiledAt);
}

function message(shop: ShopInfo, doc: Doc): string {
  if (doc.kind === "order") return orderMessage(shop, doc.order, doc.items);
  if (doc.kind === "bill") return billMessage(shop, doc.bill, doc.items);
  return doc.suppliers.map((s) => supplierMessage(shop, doc.day, s)).join("\n\n――――――\n\n");
}

function phoneOf(doc: Doc): string {
  if (doc.kind === "order") return doc.order.customerPhone;
  if (doc.kind === "bill") return doc.bill.customerPhone;
  return doc.suppliers.length === 1 ? doc.suppliers[0].supplierPhone : "";
}

/** Download, share (PDF via the phone's share sheet) and WhatsApp buttons for any document. */
export function DocActions({
  shop,
  doc,
  print = false,
  compact = false,
}: {
  shop: ShopInfo;
  doc: Doc;
  print?: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(kind: "download" | "share") {
    setBusy(kind);
    setNote(null);
    try {
      const { blob, filename } = await build(shop, doc);
      if (kind === "download") {
        downloadBlob(blob, filename);
        setNote(`Saved ${filename}`);
      } else {
        const result = await sharePdf(blob, filename, message(shop, doc));
        if (result === "downloaded") {
          setNote("This device cannot share files directly, so the PDF was downloaded. Attach it in WhatsApp or email.");
        }
      }
    } catch (err) {
      console.error(err);
      setNote("Could not make the PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const phone = phoneOf(doc);
  const size = compact ? "btn-sm" : "";

  return (
    <div className="no-print">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`btn btn-outline ${size}`} onClick={() => run("download")} disabled={busy !== null}>
          {busy === "download" ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          Download PDF
        </button>
        <button type="button" className={`btn btn-outline ${size}`} onClick={() => run("share")} disabled={busy !== null}>
          {busy === "share" ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
          Share PDF
        </button>
        <a
          className={`btn btn-whatsapp ${size}`}
          href={whatsappUrl(phone, message(shop, doc))}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} />
          WhatsApp{phone ? "" : " message"}
        </a>
        {print && (
          <button type="button" className={`btn btn-outline ${size}`} onClick={() => window.print()}>
            <Printer size={18} />
            Print
          </button>
        )}
      </div>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </div>
  );
}

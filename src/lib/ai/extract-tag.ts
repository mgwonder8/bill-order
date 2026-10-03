import OpenAI from "openai";
import type { TagExtract } from "@/lib/types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// gpt-4o handles handwriting on these cards noticeably better than the mini model,
// and a tag scan is a once-per-lot cost, so accuracy wins over price here.
const MODEL = "gpt-4o";

const schema = {
  type: "object",
  properties: {
    supplierName: { type: "string", description: "Printed company name on the tag letterhead, e.g. BONOSTYLE CREATIONS LLP" },
    supplierAddress: { type: "string", description: "Printed postal address on one line; where the tag breaks to a new line, join with a comma and a space. Empty string if absent" },
    supplierPhone: { type: "string", description: "Printed phone number, digits and + only" },
    supplierEmail: { type: "string", description: "Printed email address" },
    supplierGstin: { type: "string", description: "15 character GSTIN if printed on the tag, else empty string" },
    brand: { type: "string", description: "Value written against BRAND" },
    designNo: { type: "string", description: "Value written against DESIGN NO, e.g. KW-1170" },
    fabric: { type: "string", description: "Fabric description written against FABRIC, without the GSM number" },
    gsm: { type: "string", description: "Fabric weight in GSM as digits only, e.g. 220. Empty string if not written." },
    color: { type: "string", description: "Colour if written anywhere on the tag, else empty string" },
    sizeRates: {
      type: "array",
      description:
        "One entry per line under DETAILS. A line like '22/24/26/28 - 260' means sizes 22, 24, 26 and 28 are priced at 260 rupees per piece.",
      items: {
        type: "object",
        properties: {
          sizes: { type: "array", items: { type: "string" }, description: "Each size on that line, as written" },
          rate: { type: "number", description: "Rate per piece in rupees for those sizes" },
        },
        required: ["sizes", "rate"],
        additionalProperties: false,
      },
    },
    remarks: { type: "string", description: "Any other handwritten note on the tag, empty string if none" },
    confidence: { type: "string", enum: ["high", "medium", "low"], description: "How legible the handwriting was overall" },
    warnings: {
      type: "array",
      items: { type: "string" },
      description: "Specific fields you were unsure about, phrased for a shop clerk to double check. Empty array if none.",
    },
  },
  required: [
    "supplierName", "supplierAddress", "supplierPhone", "supplierEmail", "supplierGstin", "brand", "designNo",
    "fabric", "gsm", "color", "sizeRates", "remarks", "confidence", "warnings",
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `You read photographs of garment manufacturing tags from Indian clothing suppliers and turn them into structured data.

The tag has a printed letterhead at the top (supplier company name, address, email, phone) and handwritten values filled in against printed labels such as BRAND, DESIGN NO, FABRIC and DETAILS.

Rules:
- Copy handwritten values exactly as written. Do not expand abbreviations or correct spellings.
- Under DETAILS, a line such as "22/24/26/28 - 260" lists the sizes on the left and the per piece rate in rupees on the right. Return every size separately. A trailing "/-" after the number is the rupee shorthand and is not part of the number.
- Sizes may be numeric (22, 24) or letters (S, M, L, XL). Keep them as written.
- FABRIC often ends with a GSM figure, for example "PLATING KNIT 220GSM". Put the fabric words in fabric and the number alone in gsm.
- If a field is not present on the tag, return an empty string rather than guessing.
- If a digit is genuinely ambiguous, pick the most likely reading, lower the confidence, and add a warning naming that field.`;

/** Reads one tag photo. The result is a draft for a human to confirm, never saved as is. */
export async function extractTag(image: { buffer: Buffer; type: string }): Promise<TagExtract> {
  const openai = getClient();
  const dataUrl = `data:${image.type || "image/jpeg"};base64,${image.buffer.toString("base64")}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "Read this tag and return the structured fields." },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: { type: "json_schema", json_schema: { name: "garment_tag", schema, strict: true } },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("The vision model did not return any tag data");
  return normalise(JSON.parse(content) as TagExtract);
}

/** Trims stray rupee marks and drops size rows the model returned empty. */
function normalise(raw: TagExtract): TagExtract {
  return {
    ...raw,
    designNo: (raw.designNo ?? "").trim().replace(/[-—–\s]+$/, ""),
    supplierGstin: (raw.supplierGstin ?? "").toUpperCase().replace(/\s/g, ""),
    gsm: (raw.gsm ?? "").replace(/[^0-9.]/g, ""),
    sizeRates: (raw.sizeRates ?? [])
      .map((g) => ({
        sizes: (g.sizes ?? []).map((s) => String(s).trim()).filter(Boolean),
        rate: Number(String(g.rate).replace(/[^0-9.]/g, "")) || 0,
      }))
      .filter((g) => g.sizes.length > 0),
    warnings: raw.warnings ?? [],
  };
}

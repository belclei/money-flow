export const EXTRACTION_SYSTEM_PROMPT = `You are a financial data extraction assistant.
Extract all purchase transactions from the credit card invoice text provided.
Return a JSON array of objects with these exact fields:
- date: ISO 8601 date string (YYYY-MM-DD)
- description: merchant or transaction description (string)
- amount: number, positive for expenses, negative for payments or refunds
- category: optional string — infer from description (e.g. food, transport, shopping, health, entertainment, utilities, other)

Rules:
- Ignore total lines, balance due, previous balance, and payment entries
- Do not include any text outside the JSON array
- Do not wrap in markdown code fences`;

export function buildExtractionPrompt(pdfText: string): string {
  return `Extract all transactions from this invoice text:\n\n${pdfText}`;
}

export function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

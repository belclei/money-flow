import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { createHash } from "crypto";
import { authOptions } from "@/lib/auth/config";
import { toMarkdown } from "@/lib/pdf/to-markdown";
import { detectBank } from "@/lib/pdf/detect-bank";
import { getLLMProvider } from "@/lib/llm/factory";
import { prisma } from "@/lib/db/prisma";
import { ExtractedTransactionSchema } from "@/lib/validators/transaction";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function isPDF(buffer: Buffer): boolean {
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const password = (formData.get("password") as string | null) ?? undefined;
  const cardHolder = (formData.get("cardHolder") as string | null) ?? undefined;
  const month = (formData.get("month") as string | null) ?? "";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 415 });
  if (file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isPDF(buffer))
    return NextResponse.json({ error: "File is not a valid PDF" }, { status: 415 });

  // Deduplication check
  const contentHash = createHash("sha256").update(buffer).digest("hex");
  const existing = await prisma.invoice.findUnique({ where: { contentHash } });
  if (existing) {
    return NextResponse.json(
      { status: "duplicate", invoiceId: existing.id },
      { status: 409 }
    );
  }

  const extraction = await toMarkdown(buffer, password);

  if (extraction.status === "password_required")
    return NextResponse.json({ status: "password_required" }, { status: 200 });
  if (extraction.status === "error")
    return NextResponse.json({ error: extraction.message }, { status: 422 });

  // Auto-detect bank from markdown text; allow manual override via form
  const manualCardBrand = (formData.get("cardBrand") as string | null) ?? undefined;
  const detectedCardBrand = detectBank(extraction.text);
  const cardBrand = manualCardBrand || detectedCardBrand;

  let rawTransactions: unknown;
  try {
    const llm = await getLLMProvider();
    rawTransactions = await llm.extract(extraction.text);
  } catch (err) {
    return NextResponse.json(
      { error: `LLM extraction failed: ${String(err)}` },
      { status: 502 }
    );
  }

  const parsed = z.array(ExtractedTransactionSchema).safeParse(rawTransactions);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "LLM returned invalid data", details: parsed.error.issues },
      { status: 422 }
    );
  }

  return NextResponse.json({
    status: "preview",
    transactions: parsed.data,
    meta: { filename: file.name, cardBrand, cardHolder, month, detectedCardBrand, contentHash },
  });
}

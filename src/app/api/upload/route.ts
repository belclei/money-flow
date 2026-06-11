import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/config";
import { extractPDFText } from "@/lib/pdf/extract";
import { getLLMProvider } from "@/lib/llm/factory";
import { prisma } from "@/lib/db/prisma";
import { ExtractedTransactionSchema } from "@/lib/validators/transaction";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

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
  const cardBrand = (formData.get("cardBrand") as string | null) ?? undefined;
  const month = (formData.get("month") as string | null) ?? "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are accepted" },
      { status: 415 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 20MB)" },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!isPDF(buffer)) {
    return NextResponse.json(
      { error: "File is not a valid PDF" },
      { status: 415 }
    );
  }

  const extraction = await extractPDFText(buffer, password);

  if (extraction.status === "password_required") {
    return NextResponse.json({ status: "password_required" }, { status: 200 });
  }

  if (extraction.status === "error") {
    return NextResponse.json({ error: extraction.message }, { status: 422 });
  }

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

  const invoice = await prisma.invoice.create({
    data: {
      filename: file.name,
      cardBrand,
      month,
      status: "processed",
      transactions: {
        create: parsed.data.map((t) => ({
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
          category: t.category,
          paymentMethod: "credit_card",
          cardBrand,
          source: "pdf_import",
          invoiceMonth: month,
        })),
      },
    },
    include: { transactions: true },
  });

  return NextResponse.json({ status: "ok", invoice }, { status: 201 });
}

export type PDFExtractionResult =
  | { status: "ok"; text: string }
  | { status: "password_required" }
  | { status: "error"; message: string };

export async function extractPDFText(
  buffer: Buffer,
  password?: string
): Promise<PDFExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");

  // Disable web worker for server-side usage
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    password: password ?? "",
    disableWorker: true,
  } as Parameters<typeof pdfjsLib.getDocument>[0]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any;
  try {
    pdf = await loadingTask.promise;
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e?.name === "PasswordException") {
      return { status: "password_required" };
    }
    return { status: "error", message: e?.message ?? String(err) };
  }

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as { str?: string }[])
      .map((item) => item.str ?? "")
      .join(" ");
    pages.push(pageText);
  }

  return { status: "ok", text: pages.join("\n") };
}

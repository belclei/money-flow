import { writeFile, unlink } from "fs/promises";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

export type PDFExtractionResult =
  | { status: "ok"; text: string }
  | { status: "password_required" }
  | { status: "error"; message: string };

const PYTHON_BIN = join(process.cwd(), ".venv/bin/python");
const SCRIPT = join(process.cwd(), "scripts/pdf_to_md.py");

function runScript(
  pdfPath: string,
  password?: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const args = [SCRIPT, pdfPath];
    if (password) args.push(password);

    const proc = spawn(PYTHON_BIN, args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
    proc.on("error", (err) => reject(err));
  });
}

export async function toMarkdown(
  buffer: Buffer,
  password?: string
): Promise<PDFExtractionResult> {
  const tempPath = join(
    tmpdir(),
    `mf-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`
  );

  try {
    await writeFile(tempPath, buffer);
    const result = await runScript(tempPath, password);

    if (result.exitCode === 2) {
      return { status: "password_required" };
    }

    if (result.exitCode !== 0) {
      let message = "PDF conversion failed";
      try {
        const parsed = JSON.parse(result.stderr);
        if (parsed.error) message = parsed.error;
      } catch {
        if (result.stderr) message = result.stderr.trim();
      }
      return { status: "error", message };
    }

    return { status: "ok", text: result.stdout };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      status: "error",
      message: e?.message ?? "Failed to start PDF converter",
    };
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

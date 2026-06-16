"use client";

import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ReviewTable, type ReviewTransaction } from "@/components/upload/review-table";

type Meta = { filename: string; cardBrand?: string; cardHolder?: string; month: string; detectedCardBrand?: string };

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "password_required"; file: File }
  | { status: "duplicate_ask"; file: File; invoiceId: string; filename: string; uploadedAt: string }
  | { status: "review"; transactions: ReviewTransaction[]; meta: Meta }
  | { status: "confirming" }
  | { status: "success"; count: number }
  | { status: "error"; message: string };

async function uploadFile(file: File, password?: string) {
  const fd = new FormData();
  fd.append("file", file);
  if (password) fd.append("password", password);
  return fetch("/api/upload", { method: "POST", body: fd });
}

export default function UploadPage() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [replacingFile, setReplacingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setState({ status: "error", message: "Apenas arquivos PDF são aceitos." });
      return;
    }
    setState({ status: "uploading" });

    const res = await uploadFile(file);
    const data = await res.json().catch(() => ({}));

    if (!res.ok && res.status !== 200 && data.status !== "duplicate_ask") {
      setState({ status: "error", message: data.error ?? "Falha no upload." });
      return;
    }

    if (data.status === "duplicate_ask") {
      setState({
        status: "duplicate_ask",
        file,
        invoiceId: data.invoiceId,
        filename: data.filename,
        uploadedAt: data.uploadedAt,
      });
    } else if (data.status === "password_required") {
      setState({ status: "password_required", file });
    } else if (data.status === "preview") {
      setState({ status: "review", transactions: data.transactions, meta: data.meta });
    } else {
      setState({ status: "error", message: data.error ?? "Erro desconhecido." });
    }
  }, []);

  const handleReplace = useCallback(async () => {
    if (state.status !== "duplicate_ask") return;

    // Delete old invoice
    const deleteRes = await fetch(`/api/upload/replace?invoiceId=${state.invoiceId}`, {
      method: "DELETE",
    });

    if (!deleteRes.ok) {
      setState({ status: "error", message: "Falha ao deletar fatura anterior." });
      return;
    }

    // Reprocess the new file
    setReplacingFile(null);
    await handleFile(state.file);
  }, [state, handleFile]);

  const handleKeepExisting = useCallback(() => {
    setState({ status: "idle" });
    setReplacingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (state.status !== "password_required") return;
      setPasswordError(null);
      setState({ status: "uploading" });

      const res = await uploadFile(state.file, password);
      const data = await res.json().catch(() => ({}));

      if (data.status === "password_required") {
        setState({ status: "password_required", file: state.file });
        setPasswordError("Senha incorreta. Tente novamente.");
        return;
      }
      if (data.status === "duplicate_ask") {
        setState({
          status: "duplicate_ask",
          file: state.file,
          invoiceId: data.invoiceId,
          filename: data.filename,
          uploadedAt: data.uploadedAt,
        });
        return;
      }
      if (data.status === "preview") {
        setPassword("");
        setState({ status: "review", transactions: data.transactions, meta: data.meta });
      } else {
        setState({ status: "error", message: data.error ?? "Falha no upload." });
      }
    },
    [state, password]
  );

  const handleConfirm = useCallback(
    async (transactions: ReviewTransaction[]) => {
      if (state.status !== "review") return;
      setState({ status: "confirming" });

      const res = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions, meta: state.meta }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.status === "ok") {
        setState({ status: "success", count: data.invoice?.transactions?.length ?? 0 });
      } else {
        setState({ status: "error", message: data.error ?? "Falha ao salvar." });
      }
    },
    [state]
  );

  const reset = () => {
    setState({ status: "idle" });
    setPassword("");
    setPasswordError(null);
    setReplacingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Review screen takes full width
  if (state.status === "review" || state.status === "confirming") {
    return (
      <main className="container mx-auto max-w-5xl p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Revisar importação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Confira e edite as transações antes de confirmar.
          </p>
        </div>
        <ReviewTable
          initial={state.status === "review" ? state.transactions : []}
          onConfirm={handleConfirm}
          onCancel={reset}
          loading={state.status === "confirming"}
        />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Importar fatura</h1>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/60"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          Arraste o PDF aqui, ou clique para selecionar
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {state.status === "uploading" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Extraindo e processando…</p>
          <Progress value={null} className="h-1" />
        </div>
      )}

      {state.status === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">
            {state.count} transaç{state.count !== 1 ? "ões importadas" : "ão importada"} com sucesso.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={reset}>
            Importar outra
          </Button>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{state.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={reset}>
            Tentar novamente
          </Button>
        </div>
      )}

      <Dialog
        open={state.status === "password_required"}
        onOpenChange={(open) => { if (!open) reset(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF protegido por senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-password">Senha</Label>
              <Input
                id="pdf-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={!password}>Desbloquear e importar</Button>
              <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={state.status === "duplicate_ask"}
        onOpenChange={(open) => { if (!open) handleKeepExisting(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fatura já importada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Esta fatura já foi importada anteriormente:</p>
              <p className="text-sm font-medium">{state.status === "duplicate_ask" ? state.filename : "—"}</p>
              {state.status === "duplicate_ask" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Importado em {new Date(state.uploadedAt).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
            <p className="text-sm">Deseja substituir os dados anteriores por uma nova extração?</p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleReplace}>
                Sim, substituir
              </Button>
              <Button variant="outline" onClick={handleKeepExisting}>
                Não, manter dados existentes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

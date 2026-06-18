"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewTable, type ReviewTransaction } from "@/components/upload/review-table";

type CreditCard = { id: string; name: string; institution: string | null };
type Meta = {
  filename: string;
  cardBrand?: string;
  cardHolder?: string;
  month: string;
  detectedCardBrand?: string;
  contentHash?: string;
  creditCardId?: string;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "password_required"; file: File }
  | { status: "duplicate_ask"; file: File; invoiceId: string; filename: string; uploadedAt: string }
  | { status: "review"; transactions: ReviewTransaction[]; meta: Meta }
  | { status: "confirming" }
  | { status: "link_portadores"; unknownNames: string[]; count: number }
  | { status: "success"; count: number }
  | { status: "error"; message: string };

function UploadPageInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [creditCardId, setCreditCardId] = useState(searchParams.get("cartao") ?? "");
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/credit-cards")
      .then((r) => r.json())
      .then((d) => setCreditCards(d.cards ?? []));
  }, []);

  const uploadFile = useCallback(async (file: File, pwd?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (pwd) fd.append("password", pwd);
    if (creditCardId) fd.append("creditCardId", creditCardId);
    return fetch("/api/upload", { method: "POST", body: fd });
  }, [creditCardId]);

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
      setState({ status: "duplicate_ask", file, invoiceId: data.invoiceId, filename: data.filename, uploadedAt: data.uploadedAt });
    } else if (data.status === "password_required") {
      setState({ status: "password_required", file });
    } else if (data.status === "preview") {
      setState({ status: "review", transactions: data.transactions, meta: { ...data.meta, creditCardId: creditCardId || undefined } });
    } else {
      setState({ status: "error", message: data.error ?? "Erro desconhecido." });
    }
  }, [uploadFile, creditCardId]);

  const handleReplace = useCallback(async () => {
    if (state.status !== "duplicate_ask") return;
    const deleteRes = await fetch(`/api/upload/replace?invoiceId=${state.invoiceId}`, { method: "DELETE" });
    if (!deleteRes.ok) {
      setState({ status: "error", message: "Falha ao deletar fatura anterior." });
      return;
    }
    await handleFile(state.file);
  }, [state, handleFile]);

  const handleKeepExisting = useCallback(() => {
    setState({ status: "idle" });
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
        setState({ status: "duplicate_ask", file: state.file, invoiceId: data.invoiceId, filename: data.filename, uploadedAt: data.uploadedAt });
        return;
      }
      if (data.status === "preview") {
        setPassword("");
        setState({ status: "review", transactions: data.transactions, meta: { ...data.meta, creditCardId: creditCardId || undefined } });
      } else {
        setState({ status: "error", message: data.error ?? "Falha no upload." });
      }
    },
    [state, password, uploadFile, creditCardId]
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
        const count = data.invoice?.transactions?.length ?? 0;
        if (data.unknownCardHolders?.length > 0) {
          setState({ status: "link_portadores", unknownNames: data.unknownCardHolders, count });
        } else {
          setState({ status: "success", count });
        }
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

  // Link portadores screen
  if (state.status === "link_portadores") {
    return (
      <LinkPortadoresScreen
        names={state.unknownNames}
        count={state.count}
        onDone={reset}
      />
    );
  }

  return (
    <main className="container mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Importar fatura</h1>

      {/* Credit card selector */}
      <div className="space-y-2">
        <Label>Cartão de crédito</Label>
        <Select value={creditCardId || "none"} onValueChange={(v) => setCreditCardId(v === "none" ? "" : (v ?? ""))}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar cartão (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Sem cartão associado —</SelectItem>
            {creditCards.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.institution ? ` — ${c.institution}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {creditCards.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum cartão cadastrado. <a href="/cartoes" className="underline">Cadastre um cartão</a> para vincular a fatura.
          </p>
        )}
      </div>

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

      <Dialog open={state.status === "password_required"} onOpenChange={(open) => { if (!open) reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>PDF protegido por senha</DialogTitle></DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-password">Senha</Label>
              <Input id="pdf-password" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={!password}>Desbloquear e importar</Button>
              <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={state.status === "duplicate_ask"} onOpenChange={(open) => { if (!open) handleKeepExisting(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fatura já importada</DialogTitle></DialogHeader>
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
              <Button variant="destructive" onClick={handleReplace}>Sim, substituir</Button>
              <Button variant="outline" onClick={handleKeepExisting}>Não, manter dados existentes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadPageInner />
    </Suspense>
  );
}

// ─── Link portadores screen ───────────────────────────────────────────────────

function LinkPortadoresScreen({
  names,
  count,
  onDone,
}: {
  names: string[];
  count: number;
  onDone: () => void;
}) {
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, []);

  async function handleLink(name: string) {
    const userId = selections[name];
    if (!userId) return;
    setLoading(name);
    const res = await fetch("/api/portadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, granteeUserId: userId }),
    });
    if (res.ok) setSaved((prev) => new Set([...prev, name]));
    setLoading(null);
  }

  const remaining = names.filter((n) => !saved.has(n));

  return (
    <main className="container mx-auto max-w-xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Portadores identificados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {count} transaç{count !== 1 ? "ões importadas" : "ão importada"} com sucesso.
          {remaining.length > 0
            ? " Encontramos portadores ainda não mapeados a usuários do sistema."
            : " Todos os portadores foram mapeados."}
        </p>
      </div>

      {remaining.length > 0 ? (
        <div className="space-y-4">
          {remaining.map((name) => (
            <div key={name} className="rounded-lg border p-4 space-y-3">
              <p className="font-medium text-sm">{name}</p>
              <div className="flex gap-2">
                <Select
                  value={selections[name] ?? ""}
                  onValueChange={(v) => setSelections((prev) => ({ ...prev, [name]: v ?? "" }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleLink(name)}
                  disabled={!selections[name] || loading === name}
                >
                  {loading === name ? "…" : "Vincular"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSaved((prev) => new Set([...prev, name]))}
                >
                  Pular
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">Todos os portadores foram tratados.</p>
        </div>
      )}

      <Button onClick={onDone} variant={remaining.length > 0 ? "outline" : "default"}>
        {remaining.length > 0 ? "Concluir sem vincular restantes" : "Concluir"}
      </Button>
    </main>
  );
}

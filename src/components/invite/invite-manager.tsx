"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Invite } from "@/generated/prisma/client";

function statusLabel(invite: Invite) {
  if (invite.usedAt) return { text: "Aceito", color: "text-emerald-600" };
  if (invite.expiresAt < new Date()) return { text: "Expirado", color: "text-red-500" };
  return { text: "Pendente", color: "text-amber-600" };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? "✓ copiado" : "copiar link"}
    </button>
  );
}

export function InviteManager({ initialInvites }: { initialInvites: Invite[] }) {
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNewToken(null);

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao criar convite.");
      return;
    }

    const data = await res.json();
    setNewToken(data.token);
    setEmail("");

    // Reload invites
    const listRes = await fetch("/api/invite/list");
    if (listRes.ok) {
      const listData = await listRes.json();
      setInvites(listData.invites);
    }
  }

  const inviteUrl = (token: string) =>
    `${window.location.origin}/invite/${token}`;

  return (
    <div className="space-y-8">
      {/* Create form */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Novo convite
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              required
              placeholder="pessoa@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? "admin")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador — pode importar e editar dados</SelectItem>
                <SelectItem value="viewer">Visualizador — somente leitura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Gerando…" : "Gerar convite"}
          </Button>
        </form>

        {newToken && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
            <p className="text-sm font-medium text-emerald-800">Convite criado!</p>
            <p className="text-xs text-emerald-700 break-all font-mono">
              {inviteUrl(newToken)}
            </p>
            <CopyButton text={inviteUrl(newToken)} />
          </div>
        )}
      </div>

      {/* Invite list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Histórico ({invites.length})
        </h2>

        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite gerado ainda.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {invites.map((inv) => {
              const { text, color } = statusLabel(inv);
              return (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{inv.role}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className={`text-xs font-medium ${color}`}>{text}</span>
                      {!inv.usedAt && inv.expiresAt >= new Date() && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <CopyButton text={inviteUrl(inv.token)} />
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

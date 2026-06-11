"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PDFPreviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setMarkdown("");
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    if (password) formData.append("password", password);

    const res = await fetch("/api/pdf-preview", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    setLoading(false);

    if (data.status === "ok") {
      setMarkdown(data.text);
    } else if (data.status === "password_required") {
      setError("PDF protegido por senha. Informe a senha abaixo e tente novamente.");
    } else {
      setError(data.error ?? data.message ?? "Erro desconhecido");
    }
  }

  return (
    <main className="container mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">PDF → Markdown Preview</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">PDF</Label>
          <Input
            id="file"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pwd">Senha (opcional)</Label>
          <Input
            id="pwd"
            type="password"
            placeholder="Só para PDFs protegidos"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!file || loading}>
          {loading ? "Convertendo…" : "Converter"}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </p>
      )}

      {markdown && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {markdown.length.toLocaleString()} caracteres
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(markdown)}
            >
              Copiar
            </Button>
          </div>
          <textarea
            readOnly
            value={markdown}
            className="w-full h-[60vh] font-mono text-xs border rounded p-3 bg-muted resize-none"
          />
        </div>
      )}
    </main>
  );
}

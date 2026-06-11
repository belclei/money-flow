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

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "password_required"; file: File }
  | { status: "success"; count: number }
  | { status: "error"; message: string };

async function uploadFile(file: File, password?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (password) formData.append("password", password);
  return fetch("/api/upload", { method: "POST", body: formData });
}

export default function UploadPage() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setState({ status: "error", message: "Only PDF files are accepted." });
      return;
    }
    setState({ status: "uploading" });

    const res = await uploadFile(file);
    if (!res.ok && res.status !== 200) {
      const data = await res.json().catch(() => ({}));
      setState({ status: "error", message: data.error ?? "Upload failed." });
      return;
    }

    const data = await res.json();

    if (data.status === "password_required") {
      setState({ status: "password_required", file });
      return;
    }

    if (data.status === "ok") {
      setState({
        status: "success",
        count: data.invoice?.transactions?.length ?? 0,
      });
    } else {
      setState({ status: "error", message: data.error ?? "Unknown error." });
    }
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
        setPasswordError("Incorrect password. Please try again.");
        return;
      }

      if (data.status === "ok") {
        setPassword("");
        setState({
          status: "success",
          count: data.invoice?.transactions?.length ?? 0,
        });
      } else {
        setState({ status: "error", message: data.error ?? "Upload failed." });
      }
    },
    [state, password]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setState({ status: "idle" });
    setPassword("");
    setPasswordError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <main className="container mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Upload Invoice</h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/60"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          Drag & drop a PDF here, or click to select
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* States */}
      {state.status === "uploading" && (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">Processing…</p>
          <Progress value={null} className="h-1" />
        </div>
      )}

      {state.status === "success" && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">
            Done! {state.count} transaction{state.count !== 1 ? "s" : ""} imported.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={reset}>
            Upload another
          </Button>
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{state.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={reset}>
            Try again
          </Button>
        </div>
      )}

      {/* Password dialog */}
      <Dialog
        open={state.status === "password_required"}
        onOpenChange={(open) => { if (!open) reset(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF is password protected</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-password">Password</Label>
              <Input
                id="pdf-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={!password}>
                Unlock and import
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

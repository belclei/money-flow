"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CATEGORY_KINDS,
  CATEGORY_KIND_LABELS,
  type CategoryKind,
} from "@/lib/validators/category";
import type { Category } from "@/generated/prisma/client";

const KIND_COLORS: Record<CategoryKind, string> = {
  income: "bg-green-100 text-green-800",
  expense: "bg-red-100 text-red-800",
  transfer: "bg-blue-100 text-blue-800",
};

function CategoryForm({
  category,
  onSave,
  onCancel,
}: {
  category?: Category;
  onSave: (c: Category) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>((category?.kind as CategoryKind) ?? "expense");
  const [isFixed, setIsFixed] = useState(category?.isFixed ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = category ? `/api/categories/${category.id}` : "/api/categories";
    const method = category ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind, isFixed }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar.");
      return;
    }

    onSave(await res.json());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Nome</Label>
        <Input
          id="cat-name"
          required
          placeholder="Ex: Alimentação"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind((v ?? "expense") as CategoryKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_KINDS.map((k) => (
                <SelectItem key={k} value={k}>{CATEGORY_KIND_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Natureza</Label>
          <Select
            value={isFixed ? "fixed" : "variable"}
            onValueChange={(v) => setIsFixed(v === "fixed")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="variable">Variável</SelectItem>
              <SelectItem value="fixed">Fixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando…" : category ? "Salvar alterações" : "Criar categoria"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const kind = category.kind as CategoryKind;
  const isSystem = category.userId === null;

  return (
    <div className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-medium text-sm truncate">{category.name}</span>
        {category.isFixed && (
          <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5 shrink-0">
            fixa
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${KIND_COLORS[kind]}`}>
          {CATEGORY_KIND_LABELS[kind]}
        </span>
        {isSystem ? (
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">sistema</span>
        ) : (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(category)}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(category)}
              className="text-xs text-muted-foreground hover:text-destructive px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function handleSaved(saved: Category) {
    if (editing) {
      setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      setEditing(null);
    } else {
      setCategories((prev) => [...prev, saved]);
      setAdding(false);
    }
    router.refresh();
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setDeleteLoading(true);
    await fetch(`/api/categories/${deleting.id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== deleting.id));
    setDeleteLoading(false);
    setDeleting(null);
    router.refresh();
  }

  const grouped = CATEGORY_KINDS.map((kind) => ({
    kind,
    label: CATEGORY_KIND_LABELS[kind],
    items: categories.filter((c) => c.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {categories.length} categoria{categories.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Nova categoria</Button>
      </div>

      <div className="space-y-6">
        {grouped.map(({ kind, label, items }) => (
          <div key={kind}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {label}
            </h2>
            <div className="rounded-lg border divide-y">
              {items.map((c) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma categoria encontrada.</p>
          </div>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={adding} onOpenChange={(open) => !open && setAdding(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <CategoryForm onSave={handleSaved} onCancel={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          {editing && (
            <CategoryForm
              category={editing}
              onSave={handleSaved}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir categoria?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{deleting?.name}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading ? "Excluindo…" : "Excluir"}
            </Button>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

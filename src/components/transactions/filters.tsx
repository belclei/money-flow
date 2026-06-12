"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - i);
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { value, label };
});

const CATEGORIES = [
  "food", "transport", "shopping", "health",
  "entertainment", "utilities", "other",
];

export function TransactionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={searchParams.get("month") ?? "all"}
        onValueChange={(v) => setParam("month", v ?? "")}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("category") ?? "all"}
        onValueChange={(v) => setParam("category", v ?? "")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("currency") ?? "all"}
        onValueChange={(v) => setParam("currency", v ?? "")}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Moeda" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="BRL">BRL</SelectItem>
          <SelectItem value="USD">USD</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Portador..."
        defaultValue={searchParams.get("cardHolder") ?? ""}
        className="w-40"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setParam("cardHolder", (e.target as HTMLInputElement).value);
          }
        }}
        onBlur={(e) => setParam("cardHolder", e.target.value)}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function numericToDisplay(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "";
  const str = String(value).trim();
  if (!str) return "";

  const [intPart, decPart] = str.split(".");
  const formattedInt = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${formattedInt},${decPart.slice(0, 2)}` : formattedInt;
}

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  value?: string | number;
  onChange?: (value: string) => void;
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const [display, setDisplay] = React.useState(() => numericToDisplay(value));
  const lastEmitted = React.useRef(String(value ?? ""));

  React.useEffect(() => {
    const incoming = String(value ?? "");
    if (incoming !== lastEmitted.current) {
      lastEmitted.current = incoming;
      setDisplay(numericToDisplay(value));
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let cleaned = e.target.value.replace(/[^\d,]/g, "");

    const firstComma = cleaned.indexOf(",");
    if (firstComma !== -1) {
      cleaned =
        cleaned.slice(0, firstComma + 1) +
        cleaned.slice(firstComma + 1).replace(/,/g, "").slice(0, 2);
    }

    const commaIdx = cleaned.indexOf(",");
    const intStr = commaIdx === -1 ? cleaned : cleaned.slice(0, commaIdx);
    const decStr = commaIdx === -1 ? undefined : cleaned.slice(commaIdx + 1);

    const formattedInt = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const newDisplay = decStr !== undefined ? `${formattedInt},${decStr}` : formattedInt;
    const numericStr = decStr !== undefined ? `${intStr}.${decStr}` : intStr;

    setDisplay(newDisplay);
    lastEmitted.current = numericStr;
    onChange?.(numericStr);
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      className={cn(className)}
      {...props}
    />
  );
}

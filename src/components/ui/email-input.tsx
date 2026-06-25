"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface EmailInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "type"> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function EmailInput({ onChange, ...props }: EmailInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.toLowerCase().replace(/\s/g, "");
    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: cleaned },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange?.(syntheticEvent);
  }

  return <Input type="email" onChange={handleChange} {...props} />;
}

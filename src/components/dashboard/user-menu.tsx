"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

function greeting(email: string) {
  const hour = new Date().getHours();
  const salutation =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const name = email.split("@")[0].split(".")[0];
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  return `${salutation}, ${displayName}`;
}

export function UserMenu({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:block">
        {greeting(email)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-muted-foreground hover:text-foreground"
      >
        Sair
      </Button>
    </div>
  );
}

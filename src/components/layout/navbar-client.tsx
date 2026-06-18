"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function greeting(name: string | null, email: string) {
  const hour = new Date().getHours();
  const salutation =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const displayName = name?.trim()
    ? name.split(" ")[0]
    : email.split("@")[0].split(".")[0].replace(/^(.)/, (c) => c.toUpperCase());

  return `${salutation}, ${displayName}`;
}

interface Props {
  email: string;
  name: string | null;
  role: string;
  isSuperadmin: boolean;
}

export function NavbarClient({ email, name, role, isSuperadmin }: Props) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <span className="text-sm text-muted-foreground hidden md:block mr-1">
        {greeting(name, email)}
      </span>

      {isSuperadmin && (
        <Link
          href="/convites"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
        >
          Convidar
        </Link>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sair
      </Button>
    </div>
  );
}

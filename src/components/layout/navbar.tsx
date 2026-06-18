import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { NavbarClient } from "./navbar-client";

export async function Navbar() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { email, name, role } = session.user;
  const isSuperadmin = email === "belclei@gmail.com";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-foreground hover:text-emerald-600 transition-colors shrink-0"
        >
          Money Flow
        </Link>

        {/* Actions */}
        <NavbarClient
          email={email}
          name={name}
          role={role}
          isSuperadmin={isSuperadmin}
        />
      </div>
    </header>
  );
}

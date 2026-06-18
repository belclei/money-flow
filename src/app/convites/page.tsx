import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { InviteManager } from "@/components/invite/invite-manager";

const SUPERADMIN = "belclei@gmail.com";

export default async function ConvitesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  if (session.user.email !== SUPERADMIN) redirect("/dashboard");

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Convites</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os convites para acesso ao Money Flow.
        </p>
      </div>
      <InviteManager initialInvites={invites} />
    </main>
  );
}

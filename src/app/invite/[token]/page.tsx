import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/invite?token=${token}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  if (!data.valid) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">
          Este link de convite é inválido ou expirou.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AcceptInviteForm token={token} email={data.email} />
    </main>
  );
}

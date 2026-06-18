import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { CategoriesClient } from "@/components/categories/categories-client";

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: session.user.id }, { userId: null }] },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return (
    <main className="container mx-auto max-w-2xl p-6 space-y-6">
      <CategoriesClient initialCategories={categories} />
    </main>
  );
}

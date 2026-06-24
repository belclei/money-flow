import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

const SUPERADMIN = "belclei@gmail.com";

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await getServerSession(authOptions);
	if (!session || session.user.email !== SUPERADMIN) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id } = await params;

	const invite = await prisma.invite.findUnique({ where: { id } });
	if (!invite) {
		return NextResponse.json(
			{ error: "Convite não encontrado" },
			{ status: 404 },
		);
	}

	// If the invite was accepted, find and purge the user and all their data
	if (invite.usedAt) {
		const user = await prisma.user.findUnique({
			where: { email: invite.email },
		});

		if (user) {
			await prisma.$transaction(async (tx) => {
				// 1. Delete transactions owned by the user
				await tx.transaction.deleteMany({ where: { userId: user.id } });

				// 2. Delete purchases
				await tx.purchase.deleteMany({ where: { userId: user.id } });

				// 3. Delete invoices (after their transactions are gone)
				await tx.invoice.deleteMany({ where: { userId: user.id } });

				// 4. Delete account statements
				await tx.accountStatement.deleteMany({ where: { userId: user.id } });

				// 5. Delete recurring transactions
				await tx.recurringTransaction.deleteMany({
					where: { userId: user.id },
				});

				// 6. Delete categories
				await tx.category.deleteMany({ where: { userId: user.id } });

				// 7. Null out debitAccountId on credit cards that reference this user's accounts
				//    before deleting accounts (to avoid FK violation)
				const accountIds = await tx.account
					.findMany({ where: { userId: user.id }, select: { id: true } })
					.then((rows) => rows.map((r) => r.id));

				if (accountIds.length > 0) {
					await tx.creditCard.updateMany({
						where: { debitAccountId: { in: accountIds } },
						data: { debitAccountId: null },
					});
				}

				// 8. Delete credit cards
				await tx.creditCard.deleteMany({ where: { userId: user.id } });

				// 9. Delete accounts
				await tx.account.deleteMany({ where: { userId: user.id } });

				// 10. Delete portador aliases owned by this user
				await tx.portadorAlias.deleteMany({ where: { ownerUserId: user.id } });

				// 11. Delete the user (cascades: accesses + portador aliases as grantee)
				await tx.user.delete({ where: { id: user.id } });
			});
		}
	}

	// Finally, delete the invite itself
	await prisma.invite.delete({ where: { id } });

	return NextResponse.json({ status: "ok" });
}

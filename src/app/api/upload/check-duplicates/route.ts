import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { ExtractedTransactionSchema } from "@/lib/validators/transaction";

const CheckDuplicatesSchema = z.object({
	transactions: z.array(ExtractedTransactionSchema),
});

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await req.json();
	const parsed = CheckDuplicatesSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
	}

	const { transactions } = parsed.data;
	const userId = session.user.id;

	const conflicts: {
		index: number;
		incoming: (typeof transactions)[number];
		existing: {
			id: string;
			date: string;
			description: string;
			amount: number;
			currency: string;
			source: string;
			paymentMethod: string;
		};
	}[] = [];

	for (let i = 0; i < transactions.length; i++) {
		const t = transactions[i];
		const date = new Date(t.date);

		const existing = await prisma.transaction.findFirst({
			where: {
				userId,
				date,
				amount: t.amount,
			},
			select: {
				id: true,
				date: true,
				description: true,
				amount: true,
				currency: true,
				source: true,
				paymentMethod: true,
			},
		});

		if (existing) {
			conflicts.push({
				index: i,
				incoming: t,
				existing: {
					...existing,
					date: existing.date.toISOString().slice(0, 10),
				},
			});
		}
	}

	return NextResponse.json({ conflicts });
}

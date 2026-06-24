import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";

export const authOptions: NextAuthOptions = {
	session: { strategy: "jwt" },
	pages: {
		signIn: "/auth/login",
	},
	providers: [
		CredentialsProvider({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials.password) return null;

				const user = await prisma.user.findUnique({
					where: { email: credentials.email },
				});
				if (!user) return null;

				const valid = await bcrypt.compare(
					credentials.password,
					user.passwordHash,
				);
				if (!valid) return null;

				return {
					id: user.id,
					email: user.email,
					name: user.name ?? null,
					nickname: user.nickname ?? null,
					role: user.role,
				};
			},
		}),
	],
	callbacks: {
		jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.name = (user as { name?: string | null }).name ?? null;
				token.nickname =
					(user as { nickname?: string | null }).nickname ?? null;
				token.role = (user as { role: string }).role;
			}
			return token;
		},
		session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id;
				session.user.name = token.name ?? null;
				session.user.nickname = (token.nickname as string | null) ?? null;
				session.user.role = token.role;
			}
			return session;
		},
	},
};

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
	token: string;
	email: string;
}

export function AcceptInviteForm({ token, email }: Props) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [nickname, setNickname] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (password !== confirm) {
			setError("As senhas não coincidem");
			return;
		}
		setLoading(true);
		setError(null);

		const res = await fetch("/api/invite?action=accept", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, password, name, nickname }),
		});

		setLoading(false);

		if (!res.ok) {
			const data = await res.json();
			setError(data.error ?? "Erro ao criar conta");
		} else {
			router.push("/auth/login?invited=1");
		}
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Criar sua conta</CardTitle>
				<CardDescription>{email}</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Nome completo</Label>
						<Input
							id="name"
							type="text"
							required
							minLength={2}
							placeholder="Seu nome completo"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="nickname">Como posso te chamar?</Label>
						<Input
							id="nickname"
							type="text"
							required
							minLength={1}
							placeholder="Ex: Bel, João, Pri…"
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Senha</Label>
						<Input
							id="password"
							type="password"
							required
							minLength={8}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirm">Confirmar senha</Label>
						<Input
							id="confirm"
							type="password"
							required
							minLength={8}
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
						/>
					</div>
					{error && <p className="text-sm text-red-500">{error}</p>}
					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Criando conta…" : "Criar conta"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

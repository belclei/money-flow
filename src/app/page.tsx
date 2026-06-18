import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight">Money Flow</span>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="pt-32 pb-24 px-6">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-600">
              Acesso por convite
            </div>

            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-tight">
              Quanto posso{" "}
              <span className="text-emerald-600">gastar hoje?</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Não é uma estimativa. É um cálculo exato — saldo real menos
              faturas pendentes menos despesas fixas que ainda vêm este mês.
              Um número, sem ambiguidade.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Entrar na minha conta
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Como funciona
              </a>
            </div>
          </div>
        </section>

        {/* ── Numbers that matter ──────────────────────────────── */}
        <section id="como-funciona" className="py-20 px-6 border-t border-border/40">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-semibold tracking-tight">Três números. Tudo que você precisa.</h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                O dashboard não tem gráficos decorativos nem métricas vagas.
                Tem exatamente os três números que respondem às perguntas reais.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-3">
                <div className="text-3xl font-bold text-emerald-600 tabular-nums">R$ 847</div>
                <h3 className="font-semibold">Disponível hoje</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Saldo líquido nas suas contas correntes, menos as faturas que
                  ainda não venceram, menos os pagamentos fixos que chegam antes
                  do fim do mês.
                </p>
              </div>

              <div className="rounded-2xl border p-6 space-y-3">
                <div className="text-3xl font-bold tabular-nums">R$ 42.300</div>
                <h3 className="font-semibold">Patrimônio total</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tudo que você tem — contas, investimentos — menos tudo que
                  você deve. O retrato completo em uma linha, atualizado sempre
                  que você tocar nos saldos.
                </p>
              </div>

              <div className="rounded-2xl border p-6 space-y-3">
                <div className="text-3xl font-bold tabular-nums">R$ 1.240</div>
                <h3 className="font-semibold">Previsão fim do mês</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Se nenhuma surpresa acontecer, quanto você vai ter. Calculado
                  pelas suas recorrências reais: salário, aluguel, assinaturas —
                  o que ainda vem e o que ainda sai.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section className="py-20 px-6 border-t border-border/40">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-semibold tracking-tight">Feito para quem leva finanças a sério.</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg">
                  ↗
                </div>
                <h3 className="font-semibold text-lg">PDF da fatura → dados reais em segundos</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Arraste o extrato do cartão e a IA extrai cada transação.
                  Você revisa linha a linha antes de qualquer coisa ser salva.
                  Nenhum número entra no sistema sem o seu aval.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg">
                  ⇄
                </div>
                <h3 className="font-semibold text-lg">Família no mesmo cartão, sem confusão</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Portadores diferentes no mesmo extrato? Cada pessoa entra com
                  seu login e vê apenas as suas transações. O titular compartilha
                  a visão completa com quem escolher.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg">
                  ✓
                </div>
                <h3 className="font-semibold text-lg">Dado confirmado, nunca inferido</h3>
                <p className="text-muted-foreground leading-relaxed">
                  O que é certo é certo. O que é projeção é identificado como
                  tal. O sistema nunca mistura saldo real com estimativa —
                  princípio não negociável desde o primeiro dia.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg">
                  ↻
                </div>
                <h3 className="font-semibold text-lg">Recorrências que trabalham por você</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cadastre salário, aluguel, assinaturas. O sistema projeta seu
                  caixa para o fim do mês e para os próximos meses com as suas
                  obrigações reais — não com médias estatísticas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Invite CTA ───────────────────────────────────────── */}
        <section className="py-20 px-6 border-t border-border/40">
          <div className="mx-auto max-w-xl text-center space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">Por convite.</h2>
              <p className="text-muted-foreground leading-relaxed">
                Money Flow não tem cadastro aberto. Se você recebeu um convite,
                crie sua conta usando o link do e-mail. Se ainda não tem um,
                fale com quem te indicou.
              </p>
            </div>

            <div className="rounded-2xl border bg-muted/30 p-8 space-y-4">
              <p className="text-sm font-medium">Já tem conta?</p>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center w-full rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Entrar no Money Flow
              </Link>
              <p className="text-xs text-muted-foreground">
                Recebeu um convite por e-mail? Use o link direto que recebeu — ele já vai criar sua conta.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between text-xs text-muted-foreground">
          <span>Money Flow</span>
          <span>Acesso restrito por convite</span>
        </div>
      </footer>
    </div>
  );
}

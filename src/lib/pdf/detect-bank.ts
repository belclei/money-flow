const BANK_PATTERNS: { name: string; patterns: RegExp[] }[] = [
  { name: "Nubank", patterns: [/nubank/i, /\bnu\b/i] },
  { name: "Itaú", patterns: [/ita[uú]/i, /itaucard/i, /itaucred/i] },
  { name: "Bradesco", patterns: [/bradesco/i] },
  { name: "Santander", patterns: [/santander/i] },
  { name: "Caixa", patterns: [/caixa econ[oô]mica/i, /\bcef\b/i] },
  { name: "Banco do Brasil", patterns: [/banco do brasil/i, /\bbb\b/i, /ourocard/i] },
  { name: "XP", patterns: [/\bxp\b/i, /xp investimentos/i] },
  { name: "C6 Bank", patterns: [/c6 bank/i, /\bc6\b/i] },
  { name: "Inter", patterns: [/banco inter/i, /\binter\b/i] },
  { name: "BTG", patterns: [/btg pactual/i, /\bbtg\b/i] },
  { name: "Sicredi", patterns: [/sicredi/i] },
  { name: "Banrisul", patterns: [/banrisul/i] },
  { name: "Safra", patterns: [/\bsafra\b/i] },
  { name: "PicPay", patterns: [/picpay/i] },
  { name: "Neon", patterns: [/\bneon\b/i] },
  { name: "Mercado Pago", patterns: [/mercado pago/i, /mercadopago/i] },
  { name: "Porto", patterns: [/porto seguro/i, /\bporto\b/i] },
  { name: "Sicoob", patterns: [/sicoob/i] },
  { name: "Agibank", patterns: [/agibank/i, /\bagi\b/i] },
];

export function detectBank(text: string): string | undefined {
  // Check only the first 2000 chars — bank name is always in the header
  const header = text.slice(0, 2000);
  for (const { name, patterns } of BANK_PATTERNS) {
    if (patterns.some((p) => p.test(header))) return name;
  }
  return undefined;
}

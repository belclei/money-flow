export interface BankConfig {
  bg: string;       // background color
  text: string;     // text color (contrasting)
  accent: string;   // accent / muted tone
  abbrev: string;   // abbreviation for the logo badge
  logo?: string;    // URL to bank logo (optional)
}

const BANK_MAP: Record<string, BankConfig> = {
  nubank:           { bg: "#8A05BE", text: "#FFFFFF", accent: "#B44FE8", abbrev: "Nu", logo: "https://logo.clearbit.com/nubank.com.br" },
  itaú:             { bg: "#003D7C", text: "#FFFFFF", accent: "#FF6B00", abbrev: "Itaú", logo: "https://logo.clearbit.com/itau.com.br" },
  itau:             { bg: "#003D7C", text: "#FFFFFF", accent: "#FF6B00", abbrev: "Itaú", logo: "https://logo.clearbit.com/itau.com.br" },
  bradesco:         { bg: "#CC0000", text: "#FFFFFF", accent: "#FF4444", abbrev: "Bra", logo: "https://logo.clearbit.com/bradesco.com.br" },
  santander:        { bg: "#EC0000", text: "#FFFFFF", accent: "#FF3333", abbrev: "San", logo: "https://logo.clearbit.com/santander.com.br" },
  "banco do brasil":{ bg: "#003087", text: "#FFFFFF", accent: "#FEDA00", abbrev: "BB", logo: "https://logo.clearbit.com/bb.com.br" },
  "bb":             { bg: "#003087", text: "#FFFFFF", accent: "#FEDA00", abbrev: "BB", logo: "https://logo.clearbit.com/bb.com.br" },
  caixa:            { bg: "#005CA9", text: "#FFFFFF", accent: "#F26522", abbrev: "CEF", logo: "https://logo.clearbit.com/caixa.gov.br" },
  "cef":            { bg: "#005CA9", text: "#FFFFFF", accent: "#F26522", abbrev: "CEF", logo: "https://logo.clearbit.com/caixa.gov.br" },
  inter:            { bg: "#FF6B00", text: "#FFFFFF", accent: "#FF9240", abbrev: "Inter", logo: "https://logo.clearbit.com/inter.com.br" },
  c6:               { bg: "#1B1B1B", text: "#FFFFFF", accent: "#444444", abbrev: "C6", logo: "https://logo.clearbit.com/c6bank.com.br" },
  "c6 bank":        { bg: "#1B1B1B", text: "#FFFFFF", accent: "#444444", abbrev: "C6", logo: "https://logo.clearbit.com/c6bank.com.br" },
  xp:               { bg: "#1A1A2E", text: "#FFFFFF", accent: "#E8C766", abbrev: "XP", logo: "https://logo.clearbit.com/xpinvestimentos.com.br" },
  btg:              { bg: "#0A2463", text: "#FFFFFF", accent: "#3D7EAA", abbrev: "BTG", logo: "https://logo.clearbit.com/btgpactual.com" },
  sicoob:           { bg: "#008140", text: "#FFFFFF", accent: "#00A651", abbrev: "Sic", logo: "https://logo.clearbit.com/sicoob.com.br" },
  sicredi:          { bg: "#009B3A", text: "#FFFFFF", accent: "#00C14A", abbrev: "Scr", logo: "https://logo.clearbit.com/sicredi.com.br" },
  picpay:           { bg: "#21C25E", text: "#FFFFFF", accent: "#14A04A", abbrev: "Pic", logo: "https://logo.clearbit.com/picpay.com" },
  pagbank:          { bg: "#FFCA00", text: "#1A1A1A", accent: "#E6B500", abbrev: "Pag", logo: "https://logo.clearbit.com/pagbank.com.br" },
  neon:             { bg: "#00D1FF", text: "#0A0A0A", accent: "#00A8CC", abbrev: "Neon", logo: "https://logo.clearbit.com/neonbank.com.br" },
  original:         { bg: "#00B386", text: "#FFFFFF", accent: "#009970", abbrev: "Ori", logo: "https://logo.clearbit.com/bankoriginal.com.br" },
  next:             { bg: "#00D890", text: "#0A1A0F", accent: "#00B578", abbrev: "Next", logo: "https://logo.clearbit.com/nextwallet.com.br" },
  mercadopago:      { bg: "#00BCFF", text: "#0A0A0A", accent: "#0099E0", abbrev: "MP", logo: "https://logo.clearbit.com/mercadopago.com.br" },
  will:             { bg: "#5533FF", text: "#FFFFFF", accent: "#7755FF", abbrev: "Will", logo: "https://logo.clearbit.com/willbank.com.br" },
  bs2:              { bg: "#0066CC", text: "#FFFFFF", accent: "#0080FF", abbrev: "BS2", logo: "https://logo.clearbit.com/bs2.com" },
};

const DEFAULT: BankConfig = { bg: "#18181B", text: "#FFFFFF", accent: "#3F3F46", abbrev: "—" };

export function getBankConfig(institution?: string | null): BankConfig {
  if (!institution) return DEFAULT;
  const key = institution.toLowerCase().trim();
  // Exact match
  if (BANK_MAP[key]) return BANK_MAP[key];
  // Partial match
  for (const [k, v] of Object.entries(BANK_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // Generate a deterministic color from the name
  const hue = [...institution].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return {
    bg: `hsl(${hue}, 55%, 28%)`,
    text: "#FFFFFF",
    accent: `hsl(${hue}, 55%, 40%)`,
    abbrev: institution.slice(0, 3),
  };
}

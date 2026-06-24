export interface BankConfig {
  bg: string;
  text: string;
  accent: string;
  abbrev: string;
  domain?: string; // used to fetch logo from icon services
}

// Returns URLs in priority order: DuckDuckGo (melhor qualidade) → Google gstatic
export function getBankLogoUrls(domain: string): string[] {
  return [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`,
  ];
}

const BANK_MAP: Record<string, BankConfig> = {
  nubank:           { bg: "#8A05BE", text: "#FFFFFF", accent: "#B44FE8", abbrev: "Nu",   domain: "nubank.com.br" },
  itaú:             { bg: "#003D7C", text: "#FFFFFF", accent: "#FF6B00", abbrev: "Itaú", domain: "itau.com.br" },
  itau:             { bg: "#003D7C", text: "#FFFFFF", accent: "#FF6B00", abbrev: "Itaú", domain: "itau.com.br" },
  bradesco:         { bg: "#CC0000", text: "#FFFFFF", accent: "#FF4444", abbrev: "Bra",  domain: "bradesco.com.br" },
  santander:        { bg: "#EC0000", text: "#FFFFFF", accent: "#FF3333", abbrev: "San",  domain: "santander.com.br" },
  "banco do brasil":{ bg: "#003087", text: "#FFFFFF", accent: "#FEDA00", abbrev: "BB",   domain: "bb.com.br" },
  bb:               { bg: "#003087", text: "#FFFFFF", accent: "#FEDA00", abbrev: "BB",   domain: "bb.com.br" },
  caixa:            { bg: "#005CA9", text: "#FFFFFF", accent: "#F26522", abbrev: "CEF",  domain: "caixa.gov.br" },
  cef:              { bg: "#005CA9", text: "#FFFFFF", accent: "#F26522", abbrev: "CEF",  domain: "caixa.gov.br" },
  inter:            { bg: "#FF6B00", text: "#FFFFFF", accent: "#FF9240", abbrev: "Inter",domain: "inter.co" },
  c6:               { bg: "#1B1B1B", text: "#FFFFFF", accent: "#444444", abbrev: "C6",   domain: "c6bank.com.br" },
  "c6 bank":        { bg: "#1B1B1B", text: "#FFFFFF", accent: "#444444", abbrev: "C6",   domain: "c6bank.com.br" },
  xp:               { bg: "#1A1A2E", text: "#FFFFFF", accent: "#E8C766", abbrev: "XP",   domain: "xpi.com.br" },
  btg:              { bg: "#0A2463", text: "#FFFFFF", accent: "#3D7EAA", abbrev: "BTG",  domain: "btgpactual.com" },
  sicoob:           { bg: "#008140", text: "#FFFFFF", accent: "#00A651", abbrev: "Sic",  domain: "sicoob.com.br" },
  sicredi:          { bg: "#009B3A", text: "#FFFFFF", accent: "#00C14A", abbrev: "Scr",  domain: "sicredi.com.br" },
  picpay:           { bg: "#21C25E", text: "#FFFFFF", accent: "#14A04A", abbrev: "Pic",  domain: "picpay.com" },
  pagbank:          { bg: "#FFCA00", text: "#1A1A1A", accent: "#E6B500", abbrev: "Pag",  domain: "pagbank.com.br" },
  neon:             { bg: "#00D1FF", text: "#0A0A0A", accent: "#00A8CC", abbrev: "Neon", domain: "neon.com.br" },
  original:         { bg: "#00B386", text: "#FFFFFF", accent: "#009970", abbrev: "Ori",  domain: "original.com.br" },
  next:             { bg: "#00D890", text: "#0A1A0F", accent: "#00B578", abbrev: "Next", domain: "next.com.br" },
  mercadopago:      { bg: "#00BCFF", text: "#0A0A0A", accent: "#0099E0", abbrev: "MP",   domain: "mercadopago.com.br" },
  "mercado pago":   { bg: "#00BCFF", text: "#0A0A0A", accent: "#0099E0", abbrev: "MP",   domain: "mercadopago.com.br" },
  will:             { bg: "#5533FF", text: "#FFFFFF", accent: "#7755FF", abbrev: "Will", domain: "willbank.com.br" },
  bs2:              { bg: "#0066CC", text: "#FFFFFF", accent: "#0080FF", abbrev: "BS2",  domain: "bs2.com.br" },
  banrisul:         { bg: "#004B9D", text: "#FFFFFF", accent: "#F47920", abbrev: "BRS",  domain: "banrisul.com.br" },
};

const DEFAULT: BankConfig = { bg: "#18181B", text: "#FFFFFF", accent: "#3F3F46", abbrev: "—" };

export function getBankConfig(institution?: string | null): BankConfig {
  if (!institution) return DEFAULT;
  const key = institution.toLowerCase().trim();
  if (BANK_MAP[key]) return BANK_MAP[key];
  for (const [k, v] of Object.entries(BANK_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  const hue = [...institution].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return {
    bg: `hsl(${hue}, 55%, 28%)`,
    text: "#FFFFFF",
    accent: `hsl(${hue}, 55%, 40%)`,
    abbrev: institution.slice(0, 3),
  };
}

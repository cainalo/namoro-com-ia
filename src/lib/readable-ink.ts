/** Cores de texto legíveis sobre a cor escolhida para o balão (WCAG). */
function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export const LIGHT_INK = "#fffdfa";
export const DARK_INK = "#342d24";

/** Mantém a cor preferida se tiver contraste >= 4.5; senão escolhe claro/escuro. */
export function readableInk(bubble: string, preferred?: string | null) {
  if (preferred) {
    const ratio = contrastRatio(bubble, preferred);
    if (ratio !== null && ratio >= 4.5) return preferred;
  }
  const light = contrastRatio(bubble, LIGHT_INK);
  const dark = contrastRatio(bubble, DARK_INK);
  if (light === null || dark === null) return preferred ?? DARK_INK;
  return light >= dark ? LIGHT_INK : DARK_INK;
}

/**
 * Sanitiza os picos usados pelo player de áudio.
 * Mantém a forma de onda limitada a 96 barras e valores entre 0.07 e 1.
 * Valores ausentes, não numéricos ou não finitos são descartados.
 */
export function normalizeWaveform(values: readonly number[]): number[] {
  return values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .slice(0, 96)
    .map((value) => Math.round(Math.max(0.07, Math.min(1, value)) * 100) / 100);
}

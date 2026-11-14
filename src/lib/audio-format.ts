/**
 * Formata segundos de áudio em mm:ss, ou h:mm:ss para durações longas.
 * Entradas inválidas e valores negativos são exibidos como 0:00.
 */
export function formatAudioTime(value: number): string {
  const totalSeconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return String(hours) + ":" + String(minutes).padStart(2, "0") + ":" + paddedSeconds;
  }
  return String(minutes) + ":" + paddedSeconds;
}

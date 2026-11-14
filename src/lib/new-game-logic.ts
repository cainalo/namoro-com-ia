export const MEMORY_SYMBOLS = ["🌙", "🍃", "🔥", "💧", "⭐", "🌸", "🍊", "🪸"] as const;

export function createMemoryDeck(random: () => number = Math.random): string[] {
  const cards = [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [cards[index], cards[other]] = [cards[other], cards[index]];
  }
  return cards;
}

export function chooseMemoryBotPair(
  deck: string[],
  matched: number[],
  known: Record<number, string>,
  random: () => number = Math.random,
): [number, number] | null {
  const available = deck.map((_, index) => index).filter((index) => !matched.includes(index));
  if (available.length < 2) return null;
  const remembered = new Map<string, number[]>();
  for (const index of available) {
    const symbol = known[index];
    if (!symbol) continue;
    remembered.set(symbol, [...(remembered.get(symbol) ?? []), index]);
  }
  const pair = [...remembered.values()].find((indexes) => indexes.length >= 2);
  if (pair) return [pair[0], pair[1]];
  const unknown = available.filter((index) => !known[index]);
  const firstPool = unknown.length ? unknown : available;
  const first = firstPool[Math.floor(random() * firstPool.length)];
  const secondKnown = available.find((index) => index !== first && known[index] === deck[first]);
  if (secondKnown !== undefined) return [first, secondKnown];
  const secondPool = available.filter((index) => index !== first && !known[index]);
  const finalPool = secondPool.length ? secondPool : available.filter((index) => index !== first);
  const second = finalPool[Math.floor(random() * finalPool.length)];
  return [first, second];
}

export const SEQUENCE_TOKEN_IDS = ["moon", "leaf", "fire", "water", "star", "flower"] as const;
export type SequenceToken = typeof SEQUENCE_TOKEN_IDS[number];

export function isSequencePrefix(target: SequenceToken[], input: SequenceToken[]) {
  return input.length <= target.length && input.every((token, index) => target[index] === token);
}

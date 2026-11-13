export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const workerCount = Math.max(1, Math.min(items.length, Math.floor(concurrency) || 1));
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let failed = false;
  let failure: unknown;

  async function worker() {
    while (!failed) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
        return;
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (failed) throw failure;
  return results;
}

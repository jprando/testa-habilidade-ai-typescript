export async function processWithLimit<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);

  const workers: Promise<void>[] = new Array(workerCount);
  for (let i = 0; i < workerCount; i++) {
    workers[i] = (async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await asyncFn(items[index], index);
      }
    })();
  }

  await Promise.all(workers);
  return results;
}
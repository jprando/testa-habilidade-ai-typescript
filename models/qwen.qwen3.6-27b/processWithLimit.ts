export async function processWithLimit<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  if (limit < 1) {
    throw new RangeError("O limite de concorrência deve ser um inteiro positivo.");
  }

  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  const workerCount = Math.min(limit, items.length);
  const workers: Promise<void>[] = [];

  for (let w = 0; w < workerCount; w++) {
    workers.push(
      (async () => {
        while (currentIndex < items.length) {
          const index = currentIndex++;
          results[index] = await asyncFn(items[index], index);
        }
      })()
    );
  }

  await Promise.all(workers);
  return results;
}
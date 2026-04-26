export async function processWithLimit<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const worker = async (): Promise<void> => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await asyncFn(items[index], index);
    }
  };

  const activeWorkers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );

  await Promise.all(activeWorkers);

  return results;
}
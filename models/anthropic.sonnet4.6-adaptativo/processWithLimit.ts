export async function processWithLimit<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) break;
      results[index] = await asyncFn(items[index]!, index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );

  return results;
}
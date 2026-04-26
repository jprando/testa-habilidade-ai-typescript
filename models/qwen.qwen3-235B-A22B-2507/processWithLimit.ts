export async function processWithLimit<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const semaphore = {
    permits: limit,
    queue: [] as Array<() => void>
  };

  const acquire = (): Promise<void> => new Promise(resolve => {
    if (semaphore.permits > 0) {
      semaphore.permits--;
      resolve();
    } else {
      semaphore.queue.push(resolve);
    }
  });

  const release = (): void => {
    if (semaphore.queue.length > 0) {
      semaphore.queue.shift()!();
    } else {
      semaphore.permits++;
    }
  };

  await Promise.all(items.map(async (item, index) => {
    await acquire();
    try {
      results[index] = await asyncFn(item, index);
    } finally {
      release();
    }
  }));

  return results;
}
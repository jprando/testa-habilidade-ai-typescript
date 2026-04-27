export async function processWithLimit<T, R>(
    items: readonly T[],
    asyncFn: (item: T, index: number) => Promise<R>,
    limit: number,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    const total = items.length;

    if (total === 0) return results;

    const workerCount = Math.min(Math.max(1, limit | 0), total);
    let cursor = 0;

    const worker = async (): Promise<void> => {
        while (true) {
            const index = cursor++;
            if (index >= total) return;
            results[index] = await asyncFn(items[index], index);
        }
    };

    const workers = Array.from({ length: workerCount }, worker);
    await Promise.all(workers);

    return results;
}

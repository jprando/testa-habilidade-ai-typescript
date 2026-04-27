export async function processWithLimit<T, R>(
    items: readonly T[],
    asyncFn: (item: T, index: number) => Promise<R>,
    limit: number,
): Promise<R[]> {
    if (!Number.isInteger(limit) || limit < 1) {
        throw new RangeError("limit must be a positive integer");
    }

    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            const item = items[index];

            results[index] = await asyncFn(item, index);
        }
    };

    const workerCount = Math.min(limit, items.length);
    const workers = Array.from({ length: workerCount }, worker);

    await Promise.all(workers);

    return results;
}

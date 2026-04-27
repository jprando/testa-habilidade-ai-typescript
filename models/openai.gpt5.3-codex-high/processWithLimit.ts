export async function processWithLimit<T, R>(
    items: readonly T[],
    asyncFn: (item: T, index: number) => Promise<R>,
    limit: number,
): Promise<R[]> {
    if (!Number.isInteger(limit) || limit < 1) {
        throw new RangeError("`limit` deve ser um inteiro >= 1.");
    }

    const total = items.length;
    if (total === 0) return [];

    const results = new Array<R>(total);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
        while (true) {
            const currentIndex = nextIndex++;
            if (currentIndex >= total) break;
            results[currentIndex] = await asyncFn(
                items[currentIndex],
                currentIndex,
            );
        }
    };

    const workerCount = Math.min(limit, total);
    await Promise.all(Array.from({ length: workerCount }, worker));

    return results;
}

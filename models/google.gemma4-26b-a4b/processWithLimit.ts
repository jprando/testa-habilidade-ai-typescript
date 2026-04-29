export async function processWithLimit<T, R>(
    items: T[],
    asyncFn: (item: T, index: number) => Promise<R>,
    limit: number,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;

            // Proteção contra race condition de incremento caso o loop seja interrompido
            if (currentIndex >= items.length) break;

            results[currentIndex] = await asyncFn(
                items[currentIndex],
                currentIndex,
            );
        }
    };

    const workers: Promise<void>[] = [];
    const workerCount = Math.min(limit, items.length);

    for (let i = 0; i < workerCount; i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
    return results;
}

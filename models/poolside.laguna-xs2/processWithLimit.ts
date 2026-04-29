export async function processWithLimit<T, R>(
    items: T[],
    asyncFn: (item: T, index: number) => Promise<R>,
    limit: number,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let currentIndex = 0;

    const workers = Array.from({ length: limit }, () => {
        const worker = async () => {
            while (currentIndex < items.length) {
                const index = currentIndex++;
                results[index] = await asyncFn(items[index], index);
            }
        };
        return worker();
    });

    await Promise.all(workers);
    return results;
}

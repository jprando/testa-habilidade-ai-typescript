export async function processWithLimit<T, R>(
    items: T[],
    asyncFn: (item: T, index: number) => Promise<R>,
    limit: number,
): Promise<R[]> {
    if (limit <= 0) return [];

    const results: R[] = new Array(items.length);
    const activePromises = new Set<Promise<R>>();

    for (let i = 0; i < items.length; i++) {
        // Adiciona nova tarefa se houver capacidade disponível
        if (activePromises.size < limit) {
            const promise = asyncFn(items[i], i);
            activePromises.add(promise);

            promise.then((result) => {
                results[i] = result;
                activePromises.delete(promise);
            });
        }

        // Se estivermos no limite, aguarda a tarefa mais rápida para liberar um slot
        if (activePromises.size >= limit) {
            await Promise.race([...activePromises]);
        }
    }

    // Aguarda as tarefas restantes que ainda não iniciaram
    await Promise.all(activePromises);

    return results;
}

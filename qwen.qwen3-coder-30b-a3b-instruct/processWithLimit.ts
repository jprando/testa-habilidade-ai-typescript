export async function processWithLimit<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);

  // Processa em lotes de 'limit' tarefas simultâneas
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const promises: Promise<R>[][] = [];

    // Cria promessas para o lote atual
    for (let j = 0; j < batch.length; j++) {
      const index = i + j;
      promises.push(asyncFn(batch[j], index).then(result => [result]));
    }

    // Aguarda todas as promessas do lote e coleta resultados
    const resolvedBatch = await Promise.all(promises.flat());
    for (let k = 0; k < resolvedBatch.length; k++) {
      results[i + k] = resolvedBatch[k];
    }
  }

  return results;
}

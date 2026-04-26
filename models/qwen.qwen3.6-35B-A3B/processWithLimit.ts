export async function processWithLimit<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  if (limit <= 0) {
    throw new RangeError("O parâmetro 'limit' deve ser um número inteiro positivo.");
  }

  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  let activeCount = 0;
  const runningPromises: Promise<R>[] = [];

  while (currentIndex < items.length) {
    // Consome itens enquanto houver capacidade ociosa na fila de execução
    while (activeCount < limit && currentIndex < items.length) {
      const idx = currentIndex++;

      const task = asyncFn(items[idx], idx).finally(() => {
        activeCount--;
        // Libera o slot ocupado de forma iterativa e O(1) amortizado
        const pos = runningPromises.indexOf(task);
        if (pos !== -1) runningPromises.splice(pos, 1);
      });

      results[idx] = task;
      runningPromises.push(task);
      activeCount++;
    }

    // Quando o limite é atingido, pausa o fluxo principal até que ao menos uma promessa seja encerrada,
    // evitando busy-waiting e permitindo que a Event Loop do V8 gerencie as microtasks adequadamente.
    if (runningPromises.length > 0) {
      await Promise.race(runningPromises);
    }
  }

  // Resolve todas as promessas residuais mantendo a ordem original do array de entrada
  return Promise.all(results);
}
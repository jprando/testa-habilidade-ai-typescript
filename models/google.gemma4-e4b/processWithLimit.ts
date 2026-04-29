/**
 * Processa um array de itens assincronamente, limitando o número de tarefas concorrentes.
 * Os resultados são coletados e retornados na ordem exata dos itens de entrada.
 *
 * @param items O array de itens a serem processados.
 * @param asyncFn A função assíncrona que processa um item (recebe item e índice).
 * @param limit O limite máximo de tarefas concorrentes.
 * @returns Uma Promise que resolve com um array contendo todos os resultados na ordem correta.
 */
export async function processWithLimit<T, R>(
    items: T[],
    asyncFn: (item: T, index: number) => Promise<R>,
    limit: number,
): Promise<R[]> {
    if (!items || items.length === 0) {
        return Promise.resolve([]);
    }

    if (limit <= 0) {
        throw new Error("O limite de concorrência deve ser um valor positivo.");
    }

    // Cria um array de resultados do tamanho exato do input, preenchido com null.
    // Isso garante que, mesmo que os promises cheguem fora de ordem,
    // saberemos exatamente onde colocar cada resultado.
    const results: Array<R | null> = new Array(items.length).fill(null);

    // Mantém um mapeamento de Promises ativas, onde cada Promise é responsável
    // por um índice específico do array 'results'.
    const activePromises: Set<Promise<void>> = new Set();

    let currentIndex = 0;
    const totalItems = items.length;

    /**
     * Função interna que lança a próxima tarefa (worker)
     */
    const runWorker = async (index: number): Promise<void> => {
        try {
            // Executa a tarefa assíncrona.
            const result = await asyncFn(items[index], index);

            // Armazena o resultado no índice correto, garantindo a ordem.
            (results as unknown as Array<R>)[index] = result;
        } catch (error) {
            // Trata erros, propagando-os para que o Promise.all possa capturar.
            console.error(
                `Erro ao processar o item no índice ${index}:`,
                error,
            );
            // Dependendo da necessidade, pode-se lançar o erro ou registrar um valor padrão.
            throw error;
        }
    };

    // Este loop simula o pool de workers:
    // Enquanto houver itens pendentes OU houver trabalhadores ativos, continuamos o processo.
    while (currentIndex < totalItems || activePromises.size > 0) {
        // 1. Lançar novos trabalhadores (Worker Pool Management):
        // Lançamos trabalhadores até atingir o limite ou processar todos os itens.
        while (activePromises.size < limit && currentIndex < totalItems) {
            const itemIndex = currentIndex;
            const workerPromise = runWorker(itemIndex).finally(() => {
                // Quando um worker terminar (seja com sucesso ou falha),
                // removemos ele do conjunto de trabalhadores ativos.
                activePromises.delete(workerPromise);
            });

            activePromises.add(workerPromise);
            currentIndex++;
        }

        // 2. Esperar um worker terminar:
        // Se ainda houver trabalhadores ativos, esperamos pelo próximo para liberar espaço e lançar o próximo job.
        if (activePromises.size > 0) {
            await Promise.race(Array.from(activePromises));
        } else if (currentIndex >= totalItems) {
            // Condição de parada: não há mais itens e não há workers ativos.
            break;
        }
    }

    // O cast final é necessário porque o array 'results' foi populado por sucesso de Promises,
    // e seu tipo temporário é de forma segura indexada, mas o tipo de retorno deve ser R[].
    return results as R[];
}

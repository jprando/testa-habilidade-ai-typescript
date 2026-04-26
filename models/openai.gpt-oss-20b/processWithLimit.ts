/**
* Executa tarefas assíncronas em paralelo com limite de concorrência.
*
* @param items  Array de itens a serem processados.
* @param asyncFn Função que recebe um item e seu índice, retornando uma Promise<R>.
* @param limit   Máximo de workers ativos simultaneamente.
* @returns       Uma Promise contendo os resultados na mesma ordem dos itens originais.
*
* codigo gerado com openai/gpt-oss-20b em 25/04/2026
*/
export function processWithLimit<T, R>(
    items: T[],
    asyncFn: (item: T, index: number) => Promise<R>,
                                       limit: number
): Promise<R[]> {
    const results = new Array<R>(items.length);   // mantém a ordem original
    let nextIndex = 0;                             // índice do próximo item a ser processado

    // Função worker que itera de forma iterativa até acabar os itens
    const worker = async (): Promise<void> => {
        while (true) {
            const current = nextIndex++;
            if (current >= items.length) break;        // não há mais tarefas

            results[current] = await asyncFn(items[current], current);
        }
    };

    const workers: Promise<void>[] = [];
    const workerCount = Math.min(limit, items.length);

    for (let i = 0; i < workerCount; i++) {
        workers.push(worker());
    }

    // Espera todos os workers concluírem e então devolve o array de resultados
    return Promise.all(workers).then(() => results);
}

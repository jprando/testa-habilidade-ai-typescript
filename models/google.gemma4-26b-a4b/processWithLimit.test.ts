import { describe, expect, test } from "bun:test";

import { setDefaultTimeout } from "bun:test";

// Nota: @ts-ignore é necessário aqui pois processWithLimit.ts não existe nessa pasta template.
// Ao copiar para o local correto, remova @ts-ignore e verifique se a importação resolve sem erro.
// @ts-ignore
import { processWithLimit } from "./processWithLimit";

setDefaultTimeout(5000);

describe("processWithLimit - Suíte de Estresse Master (23 Falhas)", () => {
    test("1. Funcionalidade Básica e Ordem Original (Falhas 4 e 20)", async () => {
        // Tarefas com tempos caóticos: a primeira demora muito, a última é instantânea
        const items = [50, 10, 100, 1, 20];
        const asyncFn = async (item: number) => {
            await new Promise((r) => setTimeout(r, item));
            return `val-${item}`;
        };

        const result = await processWithLimit(items, asyncFn, 3);

        // Se a Falha 4 ocorrer, o 'val-1' virá primeiro.
        // Se a Falha 20 ocorrer, haverá Promises vazadas no array.
        expect(result).toEqual([
            "val-50",
            "val-10",
            "val-100",
            "val-1",
            "val-20",
        ]);
    });

    test("2. Concorrência Real e Anti-Sobrecarga (Falhas 1, 6 e 19)", async () => {
        let currentWorkers = 0;
        let maxWorkers = 0;
        const items = [1, 2, 3, 4, 5, 6];
        const limit = 2;

        const asyncFn = async (item: number) => {
            currentWorkers++;
            maxWorkers = Math.max(maxWorkers, currentWorkers);

            // Simulando uma tarefa lenta no meio do fluxo para testar se cria "Chunks" (Falha 1)
            const delay = item === 1 ? 50 : 10;
            await new Promise((r) => setTimeout(r, delay));

            currentWorkers--;
            return item;
        };

        const start = performance.now();
        await processWithLimit(items, asyncFn, limit);
        const end = performance.now();

        // Falha 6: Se não usou await corretamente, maxWorkers vai disparar para 6.
        expect(maxWorkers).toBeLessThanOrEqual(limit);

        // Falha 1: Se usou Lotes (Chunks), o tempo total será muito maior do que a fila contínua.
        // Fila contínua: ~80ms. Chunks: ~100ms+. Usamos 90ms como margem de corte.
        expect(end - start).toBeLessThan(90);
    });

    test("3. Comportamento Fail-Fast e Sem Silenciamento (Falha 10)", async () => {
        const items = [1, 2, 3, 4];
        let execCount = 0;

        const asyncFn = async (item: number) => {
            execCount++;
            if (item === 2) {
                throw new Error("Erro forçado na tarefa 2");
            }
            await new Promise((r) => setTimeout(r, 10));
            return item;
        };

        // A execução inteira deve ser rejeitada, propagando o erro
        expect(processWithLimit(items, asyncFn, 2)).rejects.toThrow(
            "Erro forçado na tarefa 2",
        );
    });

    test("4. Casos de Contorno e Cegueira Matemática (Falhas 14 e 15)", async () => {
        const items = [1, 2];
        const asyncFn = async (i: number) => i * 2;

        let didThrowZero = false;
        try {
            const resultZero = await processWithLimit(items, asyncFn, 0);
            expect(resultZero).toEqual([]); // Se não lançar erro, DEVE ser vazio
        } catch (error) {
            didThrowZero = true;
            expect(error).toBeInstanceOf(Error);
        }

        let didThrowNeg = false;
        try {
            const resultNegative = await processWithLimit(items, asyncFn, -10);
            expect(resultNegative).toEqual([]);
        } catch (error) {
            didThrowNeg = true;
            expect(error).toBeInstanceOf(Error);
        }

        const resultOversize = await processWithLimit(items, asyncFn, 1000);
        expect(resultOversize).toEqual([2, 4]);
    });

    test("5. Imutabilidade e Efeitos Colaterais (Falhas 3, 11 e 16)", async () => {
        const originalArray = [10, 20, 30, 40];
        const copyForTesting = [...originalArray];

        // Congelamos o array. Se a IA usar .shift() (Falha 3) ou .reverse() (Falha 16), o JS vai estourar erro.
        Object.freeze(copyForTesting);

        const asyncFn = async (i: number) => i;
        const result = await processWithLimit(copyForTesting, asyncFn, 2);

        expect(result).toEqual(originalArray);
        expect(copyForTesting).toEqual(originalArray); // Garante que a referência original está intacta
    });

    test("6. Retorno Prematuro e Isolamento (Falha 5)", async () => {
        let taskFinished = false;
        const items = [1];

        const asyncFn = async () => {
            await new Promise((r) => setTimeout(r, 20));
            taskFinished = true;
            return true;
        };

        const result = await processWithLimit(items, asyncFn, 1);

        // Se ocorreu Retorno Prematuro, o result[] chega antes do taskFinished virar true
        expect(result).toEqual([true]);
        expect(taskFinished).toBe(true);
    });

    test("7. Condição de Corrida no Ponteiro (Falha 13)", async () => {
        const items = Array.from({ length: 100 }, (_, i) => i);
        const processedItems = new Set<number>();

        const asyncFn = async (item: number) => {
            // Um pequeno delay forçado para incentivar o event loop a trocar de contexto
            await new Promise((r) => setTimeout(r, Math.random() * 2));
            processedItems.add(item);
            return item;
        };

        const result = await processWithLimit(items, asyncFn, 50); // Alta concorrência

        // Se houver race condition no índice (index++ assíncrono), haverá itens duplicados e itens ignorados
        expect(processedItems.size).toBe(100);
        expect(result.length).toBe(100);
        expect(result).toEqual(items);
    });

    test("8. A Falha Sutil de Fronteira: Array Esburacado com Limite 0 (Falha 15 Revisitada)", async () => {
        const items = [1, 2, 3];
        const asyncFn = async (i: number) => i * 2;

        let didThrow = false;
        let result: number[] = [];
        try {
            result = await processWithLimit(items, asyncFn, 0);
        } catch (error) {
            didThrow = true;
            expect(error).toBeInstanceOf(Error);
        }

        if (!didThrow) {
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBe(0);
            expect(result).toEqual([]);
        }
    });

    test("9. Resiliência a retornos 'Falsy' (Prevenção da Gambiarra de Tipagem - Falhas 2 e 9)", async () => {
        // O problema: IAs ruins costumam usar `if (!results[i])` ou `if (results[i] !== undefined)`
        // para checar se uma tarefa terminou (como vimos no Gemma).
        // Se a tarefa retornar validamente false, 0, null ou undefined, a IA entra em loop infinito.
        const items = [0, false, undefined, null, ""];
        const asyncFn = async (item: any) => {
            await new Promise((r) => setTimeout(r, 5));
            return item; // Apenas ecoa o valor "falsy"
        };

        const result = await processWithLimit(items, asyncFn, 2);

        // A IA não pode ignorar ou engolir os retornos falsy. A identidade do array deve ser idêntica.
        expect(result.length).toBe(5);
        expect(result).toEqual([0, false, undefined, null, ""]);
    });

    test("10. O Dilúvio Síncrono (Zalgo Test / Quebra de Stack em Recursão)", async () => {
        // O problema: Nem toda promise demora para resolver. Se a função retornar instantaneamente
        // na Microtask Queue, IAs que usam recursividade ou pseudo-loops (como o Qwen Coder antigo)
        // vão estourar a Call Stack (Maximum call stack size exceeded) antes do limite.

        const items = Array.from({ length: 10000 }, (_, i) => i);
        let completedCount = 0;

        const asyncFn = async (i: number) => {
            completedCount++;
            return i; // Retorno "síncrono" dentro de uma função async
        };

        const start = performance.now();
        const result = await processWithLimit(items, asyncFn, 50);
        const end = performance.now();

        // O código deve processar 10.000 itens instantaneamente sem engasgar e sem quebrar a memória.
        expect(completedCount).toBe(10000);
        expect(result.length).toBe(10000);
        expect(result[9999]).toBe(9999);
        // Deve ser extremamente rápido (geralmente < 20ms)
        expect(end - start).toBeLessThan(100);
    });

    // NOTA: Falhas 8, 17, 21 e 23 (Deadlocks e Polling Quebrado) não precisam de um teste específico.
    // Qualquer um dos testes acima estourará o Timeout de 5000ms do Bun se a IA cometer essas falhas.

    // NOTA: Falhas 7 e 18 (Gargalos O(N) Ocultos) impactam a performance.
    // Se o código passar em todos os testes lógicos, mas demorar mais de 1 segundo para
    // processar uma lista simples no Bun, desconfie dessas varreduras de array.
});

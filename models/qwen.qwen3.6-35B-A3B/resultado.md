# qwen.qwen3.6-35B-A3B

| Critério | Status |
| :--- | :--- |
| **Resultado Final** | ⚠️ Aprovado com Ressalvas (Runtime OK, TS Falho) |
| **Nível de Senioridade** | Pleno |
| **Arquitetura** | Tracking Manual de Promises |

## 1. Resumo da Avaliação

O modelo **Qwen3.6-35B-A3B** passou com sucesso em todos os 10 testes de estresse (0 falhas em concorrência, ordem ou *deadlocks*). Ele possui uma lógica funcional forte, mas escolheu uma arquitetura *over-engineered* que quebra as regras estáticas do compilador TypeScript, sendo salvo apenas pela execução permissiva do Bun/Node.

## 2. Pontos Fortes

### Cláusula de Guarda Perfeita (Fail-Fast)

O modelo implementou corretamente a proteção inicial contra cálculos dinâmicos de limite inválidos:

```typescript
if (limit <= 0) throw new RangeError("...");
```

Isso evita bugs severos de memória e vazamento de alocação (Array Esburacado).

### Funcionalidade no V8

Apesar de usar rastreamento manual complexo (misturando loops `while` com array `runningPromises` e `Promise.race`), a lógica matemática interna do modelo estava perfeitamente amarrada. Nenhum worker ficou perdido e a ordem original foi preservada impecavelmente através do `Promise.all()` final.

## 3. Análise de Falhas Técnicas (Por que reprovaria no CI/CD)

### Erro de Análise Estática (TypeScript)

```typescript
const results: R[] = new Array(...);
const task = asyncFn(...);
results[idx] = task; // Injeção de Promise em array de valores
```

Embora o Bun ignore isso em tempo de execução, o comando `tsc --noEmit` de um pipeline corporativo falharia imediatamente ao perceber que uma `Promise<R>` está sendo inserida em um slot do tipo `R`.

### Escolha Algorítmica Ineficiente

Para gerenciar os slots livres, o modelo optou por:

```typescript
const pos = runningPromises.indexOf(task);
if (pos !== -1) runningPromises.splice(pos, 1);
```

Embora arrays pequenos (como o limite de 50 no Teste 10) sejam processados instantaneamente pelo motor V8, usar métodos de varredura linear e realocação de índices em um loop de alta concorrência é um anti-padrão de performance. O uso de um ponteiro atômico seria muito mais elegante e exigiria menos memória.

## 4. Veredito de Engenharia

É um código que "funciona na máquina", mas carrega dívidas técnicas arquiteturais. Demonstra que modelos maiores (35B) podem, ironicamente, "pensar demais" e tentar inventar soluções complexas para problemas que os modelos mais refinados (como o Qwen3.6-27B) resolvem com arquiteturas simples e elegantes.

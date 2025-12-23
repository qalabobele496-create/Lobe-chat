# Análise de Gap: Lógica de Sumarização vs. Implementação Real

Este documento apresenta uma comparação detalhada entre a especificação definida em [summary-logic.md](summary-logic.md) e a implementação atual.

---

## 1. O que já está de acordo (Manter)

- **Sumarização Incremental**: A implementação atual já processa mensagens em lotes de 10 (`BATCH_SIZE = 10`).
- **Preservação de Anexos (ANI)**: O código extrai o conteúdo de arquivos e os passa como contexto permanente (`globalFilesContext`).
- **Contexto Acumulativo**: Sumários anteriores são passados como `<context>` para a geração do próximo sumário.
- **Idioma**: O prompt já instrui o modelo a manter o idioma original da conversa.
- **Estimativa de Tokens**: O projeto já utiliza a biblioteca `tokenx` (via `encodeAsync` em `packages/utils`).

---

## 2. O que está parcialmente de acordo (Ajustar)

- **Limiar de Ativação**:
  - *Real*: Dispara a cada 10 mensagens novas de forma relativa.
  - *Logic*: Deve disparar especificamente na contagem absoluta (M21, M31, M41...) filtrando `system` e `tool`.
- **Densidade de Informação (5k Tokens)**:
  - *Real*: O prompt solicita 5000 tokens, mas não há validação.
  - *Logic*: Implementar verificação de tamanho do output no `internal_summaryHistory` e disparar retry se < 4500 tokens.
- **Resiliência e Retries**:
  - *Real*: Delay de 2 segundos.
  - *Logic*: Ajustar para 10 segundos e limite de 2 tentativas.
- **Prompt de Sumarização**:
  - *Real*: Utiliza a persona "Archivist Persona".
  - *Logic*: Refinar para "Arquivista de Elite RPG" com foco em densidade e preservação de mecânicas.
- **Injeção de System Instructions (SY)**:
  - *Real*: Foca em `globalFilesContext`.
  - *Logic*: Garantir que o `systemRole` (SY) seja passado como contexto permanente.

---

## 3. O que NÃO está de acordo (Refatorar)

- **Estrutura de Armazenamento**:
  - *Real*: String simples concatenada.
  - *Logic*: String serializada com delimitador `\u001f` e metadados JSON por bloco.
- **Filtragem de Mensagens**:
  - *Real*: Inclui mensagens de `system` e `tool` na contagem.
  - *Logic*: Filtrar e ignorar explicitamente mensagens com papel `system` e `tool`.
- **Rollback de Exclusão**:
  - *Real*: Não há lógica para remover sumários se mensagens forem deletadas.
  - *Logic*: Implementar o rollback automático se a contagem cair abaixo do limiar.
- **Divisor de Histórico (UI)**:
  - *Real*: Divisor visual simples.
  - *Logic*: Renderizar cards baseados no split por `\u001f`.
- **Sequencialidade de Retries**:
  - *Real*: Tentativas independentes.
  - *Logic*: Bloquear `S_n+1` se `S_n` falhar.

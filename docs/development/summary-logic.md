# Lógica de Sumarização Incremental (High-Density)

Este documento descreve a especificação técnica para o sistema de sumarização de histórico do LobeChat, otimizado para alta densidade de informações e resiliência.

---

## 1. Princípios Fundamentais

- **Identidade**: O sumarizador atua como um **Arquivista de Elite (RPG Persona)**, focado em preservar detalhes narrativos, mecânicas de jogo e citações memoráveis.
- **Densidade**: O objetivo é atingir ~5.000 tokens de informação útil por bloco de sumário.
- **Incrementalidade**: Nunca re-sumarizar o que já foi processado. O sumário $S_n$ é gerado a partir das novas mensagens $M_{batch}$ e do contexto do sumário anterior $S_{n-1}$.
- **Exclusão**: Anexos (ANI) e Instruções de Sistema (SY) **nunca** são sumarizados, mas são passados como contexto permanente para o modelo.

---

## 2. Armazenamento e Estrutura

- **Coluna**: `topics.historySummary` (Tipo: `text`).
- **Formato**: String única contendo múltiplos blocos serializados.
- **Delimitador**: Caractere de controle `\u001f` (Unit Separator).
- **Estrutura do Bloco**:
  ```text
  [JSON_METADATA]\u001f[CONTEÚDO_DO_SUMÁRIO]\u001f[JSON_METADATA]\u001f...
  ```
- **Metadados (JSON)**: `{ "id": number, "tokens": number, "model": string, "timestamp": number }`.
- **Vantagem**: Permite armazenar metadados ricos sem alterar o esquema do banco de dados, mantendo a compatibilidade com a coluna `text` existente.

---

## 3. Gatilhos de Ativação (Triggers)

- **Contagem Absoluta**: O gatilho dispara quando o número total de mensagens (filtradas) atinge marcos fixos:
  - **S1**: Dispara em M21 (Sumariza M1-M20).
  - **S2**: Dispara em M31 (Sumariza M21-M30 + Contexto S1).
  - **S3**: Dispara em M41 (Sumariza M31-M40 + Contexto S2).
- **Filtragem de Papéis**: Mensagens com `role: "system"` ou `role: "tool"` são **ignoradas** na contagem e no processo de sumarização.
- **Rollback de Exclusão**: Se uma mensagem for deletada e a contagem total cair abaixo do limiar de um bloco (ex: de 21 para 20), o último bloco de sumário (`S_n`) é removido e as mensagens voltam a ser tratadas como histórico ativo.

---

## 4. Resiliência e Qualidade

- **Retry Automático**:
  - **Delay**: 10 segundos entre tentativas.
  - **Limite**: Máximo de 2 tentativas automáticas.
- **Validação de Densidade**:
  - O output deve ser validado via `tokenx` (`encodeAsync`).
  - Se o sumário tiver menos de **4500 tokens** (quando o histórico permitir), o sistema deve disparar um retry com um "reforço" no prompt pedindo mais detalhes.
- **Sequencialidade**: Se o bloco `S_n` falhar, o sistema não tentará gerar `S_n+1` até que o anterior seja resolvido (manutenção da cadeia linear).

---

## 5. Fluxo de Contexto (Prompting)

Para cada chamada de sumarização, o modelo recebe:

1.  **System Role (SY)**: As instruções originais do agente.
2.  **Arquivos (ANI)**: Conteúdo extraído de todos os anexos da conversa.
3.  **Sumário Anterior ($S_{n-1}$)**: O bloco de sumário imediatamente anterior para continuidade.
4.  **Lote Atual ($M_{batch}$)**: As 10 mensagens novas a serem comprimidas.

O output deve ser estritamente o conteúdo do novo sumário $S_n$, sem explicações ou metadados (estes são adicionados programaticamente pelo sistema).

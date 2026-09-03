# LOVABLE SKILL: ANALYZE-FIRST REFACTORING & UX PRESERVATION

## REGRA PETREIA: ANÁLISE PRÉVIA OBRIGATÓRIA
Antes de escrever, modificar ou deletar qualquer código em resposta a um comando do usuário, você DEVE executar um diagnóstico do estado atual da aplicação. NUNCA faça alterações diretas sem antes mapear as dependências e o comportamento existente.

## FLUXO DE EXECUÇÃO EM 3 ETAPAS

### 1. Mapeamento de Contexto & Impacto (Read-First)
- **Inspecione o estado atual:** Analise como o componente, fluxo de dados, lógica de ordenação ou botão afetado está funcionando no momento.
- **Respeite o ecossistema:** Identifique as dependências macro e micro do módulo (ex: ordenação de materiais de estudo, persistência de dados, estados globais).
- **Preserve o Design System:** Nenhuma modificação visual deve violar a identidade visual já estabelecida na aplicação.

### 2. Diagnóstico & Plano de Ação Cirúrgica
- Identifique a **causa raiz** do problema reportado pelo usuário no prompt (erro de lógica, desalinhamento de dados ou gargalo de UX).
- Planeje a modificação de forma que ela seja **cirúrgica**: altere apenas o estritamente necessário para resolver o problema.
- Garanta que a solução melhore a experiência do usuário (UX) sem introduzir efeitos colaterais em telas/fluxos correlatos.

### 3. Implementação e Integridade
- Execute o ajuste mantendo a convenção de código, padrões de nomenclatura e arquitetura já existentes.
- Certifique-se de que a ordenação e hierarquia dos materiais de estudo permaneçam íntegras e previsíveis.
- Valide se o fluxo de dados entre o frontend e a lógica de persistência continua consistente após a alteração.

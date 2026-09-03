# Aplicativo em branco

## Objetivo
Deixar o aplicativo com uma tela inicial totalmente vazia, sem conteúdo placeholder, mantendo a estrutura mínima do TanStack Start.

## Mudanças

1. src/routes/index.tsx
   - Remover o placeholder `data-lovable-blank-page-placeholder` e a imagem do CDN.
   - Renderizar apenas um container vazio com `min-h-screen` e fundo `bg-background`.
   - Não adicionar conteúdo extra, botões, textos ou componentes.

2. src/routes/__root.tsx (metadados)
   - Ajustar os meta tags padrão para refletir um app sem nome/título específico.
   - Manter `og:type` e `twitter:card`.
   - Não adicionar `og:image` (não há imagem significativa).

## Fora de escopo
- Não criar novas rotas.
- Não adicionar autenticação, banco de dados ou backend.
- Não instalar dependências.

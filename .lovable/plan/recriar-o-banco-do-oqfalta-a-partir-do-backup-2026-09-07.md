# Recriar o banco do OQFalta a partir do backup

O arquivo enviado é um backup completo (formato custom do PostgreSQL) do projeto antigo. Ele contém toda a estrutura, as regras de acesso e os dados. O objetivo é reproduzir isso fielmente no Supabase conectado a este projeto.

## O que existe no backup

- 12 tipos personalizados (plano, especialidade, modo de OQ, status de assinatura, etc.)
- 29 tabelas: perfis, assinaturas, pagamentos, faturamento, cards, desempenho, histórico de estudo, favoritos, materiais, anotações e marcações, simulados (provas, questões, tentativas, respostas), indicações, lista de espera, reports de erro, problemas do admin, prompts de IA, uso de IA, chaves de API, flags do sistema, papéis de usuário, configurações do usuário e tabelas auxiliares
- 2 visões (usuários para o admin, indicações sem dados sensíveis)
- 27 funções e 14 gatilhos (criação automática de perfil, limites de IA, códigos de indicação, carimbos de atualização, manutenção diária de assinaturas, verificação de papel/admin, etc.)
- 73 regras de acesso (RLS) e 13 índices
- Dados de todas as tabelas, contas de login e configurações de armazenamento

## Etapas

### 1. Extrair e revisar o conteúdo do backup
Gerar o SQL da estrutura e dos dados a partir do arquivo, isolando apenas o que pertence ao aplicativo (descartando o que o Supabase já gerencia sozinho: sistema de autenticação interno, tempo real, filas, migrações internas).

### 2. Recriar a estrutura
Uma migração com, nesta ordem: tipos personalizados → tabelas → permissões de acesso obrigatórias → ativação de RLS → regras de acesso → funções → gatilhos → índices → visões. Ajustes necessários:
- Funções ganham `search_path` fixo, exigência de segurança atual do Supabase
- Chaves estrangeiras que apontam para contas de login são mantidas como no original
- Agendamentos automáticos (manutenção diária) são recriados se a extensão de agendamento estiver disponível; caso contrário, aviso e alternativa

### 3. Migrar as contas de login
As contas do backup são reinseridas com o mesmo identificador e a mesma senha criptografada, junto com os vínculos de login por e-mail. Assim os perfis e todo o histórico continuam ligados às pessoas certas e as senhas antigas seguem funcionando.
Limitações que serão confirmadas depois da importação: sessões ativas antigas não são restauradas (todos precisam entrar de novo) e logins por provedor externo (Google, etc.) só voltam a funcionar se o provedor estiver configurado neste projeto.

### 4. Importar os dados
Inserção dos registros de todas as 29 tabelas, em blocos e na ordem correta de dependência, com gatilhos temporariamente desligados para não duplicar efeitos (por exemplo, criação automática de perfil). Ao final, contagem por tabela comparada com o backup para confirmar fidelidade.

### 5. Armazenamento de arquivos
Recriar os "baldes" de arquivos e suas regras conforme o backup. Os arquivos em si não estão no backup do banco — apenas os registros. Vou listar o que ficou pendente para você reenviar, se houver.

### 6. Verificação final
- Rodar o verificador de segurança do Supabase e corrigir o que vier da migração
- Conferir que os tipos gerados para o aplicativo refletem o novo banco
- Relatório com contagens por tabela e qualquer item não migrado

## Detalhes técnicos

- Extração via `pg_restore` (schema-only e data-only com `--inserts --column-inserts`), filtrando os schemas `auth` (exceto `users`/`identities`), `storage`, `realtime`, `cron`, `vault`, `supabase_migrations` e `net`.
- Estrutura aplicada pela ferramenta de migração; dados aplicados em lotes pela ferramenta de execução de SQL (limite de tamanho por chamada exige divisão).
- Extensões necessárias: `pgcrypto`, `uuid-ossp`, `pg_trgm`, `pg_net`, `pg_cron` (esta última pode não estar disponível; nesse caso a manutenção diária vira chamada agendada por função de borda).
- Segredos do cofre (`vault`) não são migrados; chaves de API e webhooks precisam ser reconfigurados como segredos do projeto.
- Nada do código do aplicativo é alterado nesta entrega, exceto os tipos gerados automaticamente pelo Supabase.

## Fora do escopo

- Reenvio dos arquivos físicos de armazenamento
- Reconfiguração de provedores de login externos e de chaves de serviços de terceiros
- Ajustes de telas do aplicativo

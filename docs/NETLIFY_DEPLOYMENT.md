# Publicação do Namoro no Netlify

## Modelo de branches

- `main`: desenvolvimento contínuo. As alterações são feitas e validadas primeiro aqui.
- `prod`: produção. Recebe somente commits já validados em `main`.
- O Netlify deve usar `prod` como **Production branch**. Nunca selecionar `main` como branch de produção.

## Importar o repositório

1. No painel do Netlify, selecione **Add new project → Import an existing project**.
2. Escolha **GitHub** e autorize o acesso ao repositório `cainalo/namoro-com-ia`.
3. Selecione a branch de produção `prod`.
4. Mantenha o diretório-base vazio (raiz do repositório).
5. Confira os parâmetros abaixo e publique.

## Configuração do build

O projeto usa TanStack Start com o preset Nitro `netlify`. A configuração foi validada pelo GitHub Actions.

O arquivo `netlify.toml` já contém:

- **Build command:** `bun install --frozen-lockfile && NETLIFY=true bun run build`
- **Publish directory:** `dist`
- **Node.js:** `22`

O `.nvmrc` também fixa Node 22. O Nitro escreve os arquivos estáticos em `dist` e registra a função de servidor pela Netlify Frameworks API; por isso, o diretório de publicação deste projeto é `dist`, não `dist/client`.

Se o formulário de importação mostrar os valores automaticamente, confirme que correspondem ao `netlify.toml`. Não é necessário mudar o comando para `npm run build`.

## Variáveis de ambiente e segredos

- **Não envie nem importe o arquivo `.env` para o Netlify.** O Netlify não carrega automaticamente arquivos `.env` do repositório.
- O cliente Supabase já contém o URL do projeto e a chave publishable, que são configurações públicas usadas pelo navegador. Não cadastre uma chave `service_role` no frontend.
- **Não cadastre `LOVABLE_API_KEY` no Netlify.** Essa chave pertence ao runtime gerenciado pelo Lovable e não é necessária para a produção no Netlify.
- Em produção, `/api/chat` usa o Netlify AI Gateway. Nas funções de servidor, o Netlify injeta automaticamente `OPENAI_API_KEY` e `OPENAI_BASE_URL`; o endpoint usa essas variáveis em runtime para chamar o modelo `gpt-6-astra`.
- Não crie manualmente `OPENAI_API_KEY` ou `OPENAI_BASE_URL` no painel do Netlify. Variáveis próprias com esses nomes podem substituir as credenciais automáticas do Gateway.
- O ambiente de prévia do Lovable continua usando o Lovable AI Gateway como alternativa quando as variáveis do Netlify não existem.

### Ativação do Netlify AI Gateway

O AI Gateway está disponível nos planos baseados em créditos, desde que os recursos de IA da equipe não estejam desativados. A primeira publicação de produção é necessária para ativar o Gateway no site.

Após a primeira publicação:

1. Confira no painel da equipe Netlify se **AI Features** está habilitado.
2. Abra o site publicado e teste o Assistente de IA com uma pergunta simples.
3. Acompanhe consumo de créditos e limites no painel do Netlify. O uso de modelos é cobrado em créditos conforme o consumo.

Se o chat retornar que não está configurado logo após o primeiro deploy, confirme se o Gateway está habilitado e faça um novo deploy de produção para reinicializar as funções com as variáveis de runtime.

## Banco de dados Supabase

A publicação no Netlify não aplica migrations do Supabase. Antes de considerar Memórias e Planos prontos em produção, confirme que as migrations versionadas em `supabase/migrations/` foram aplicadas pelo fluxo oficial de integração GitHub–Supabase. Não aplicar SQL manualmente no painel nem usar a chave `service_role` no cliente.

As tabelas de Memórias e compromissos e suas publicações Realtime são dependências dessas áreas. Sem as migrations, a interface informa que a estrutura está sendo preparada.

## Validação antes e depois da publicação

O workflow `.github/workflows/verify.yml` executa:

1. Instalação congelada com Bun.
2. Testes automatizados.
3. Build para a prévia do Lovable.
4. Build para Netlify com `NETLIFY=true`.

Não promover `main` para `prod` enquanto os quatro passos não forem aprovados.

Depois do primeiro deploy, testar no domínio Netlify:

- Criar conta, confirmar e-mail e entrar.
- Abrir Hoje, Conversas, Memórias, Planos, Casa e Jogos.
- Enviar uma mensagem na conversa e testar o Assistente de IA.
- Criar um registro privado e um compartilhado, após confirmar as migrations.
- Criar um compromisso no calendário, após confirmar as migrations.
- Testar o acesso em celular e em dois aparelhos/contas para as funções compartilhadas.

## Estado da preparação

A configuração Nitro/Netlify e o endpoint de IA para produção estão em `main`. O build e os testes do commit `9f4eefe10cf0342b7d354b1c1ed6d37878235586` passaram. A branch `prod` ainda precisa receber essa versão antes de o site ser conectado/publicado.

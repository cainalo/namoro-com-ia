# Publicação do Namoro no Netlify

## Modelo de branches

- `main`: desenvolvimento contínuo; recebe as alterações primeiro.
- `prod`: candidata a produção; somente recebe uma versão depois da validação na `main`.
- O Netlify deve usar `prod` como Production branch. Não configurar `main` como Production branch.

## Configuração do build

O repositório usa TanStack Start com o preset Nitro já incluído pelo wrapper de Vite do Lovable. Para preservar a prévia do Lovable, o destino Nitro é condicional:

- Fora do Netlify, a configuração original do Lovable permanece inalterada.
- Quando `NETLIFY=true`, o Nitro usa o preset `netlify`.

O Nitro publica os arquivos estáticos em `dist` e registra as funções de servidor pela integração Netlify Frameworks API. Por isso, neste projeto, o Publish directory correto é `dist`, não `dist/client`.

`netlify.toml` configura:
- Build command: `bun install --frozen-lockfile && NETLIFY=true bun run build`
- Publish directory: `dist`
- Node.js: `22`

O arquivo `.nvmrc` também fixa Node 22.

## Variáveis de ambiente

Não enviar `.env` ao GitHub. O Netlify não importa automaticamente os valores de arquivos `.env`; configurar segredos em Project configuration → Environment variables.

- `LOVABLE_API_KEY`: necessária no ambiente de execução da função de servidor `/api/chat`, que usa o Lovable AI Gateway. Copiar a chave do secret do projeto Lovable para o ambiente do site Netlify, sem incluí-la no código.
- O URL do Supabase e a chave publishable atualmente são valores públicos configurados no cliente em `src/integrations/supabase/client.ts`. Nunca colocar uma chave `service_role` no navegador ou em variável `VITE_*`.

## Validação contínua

O workflow `.github/workflows/verify.yml` executa:
1. Instalação congelada com Bun.
2. Testes automatizados.
3. Build com o destino padrão do Lovable.
4. Build com `NETLIFY=true`, usando o preset Netlify.

A versão não deve ser promovida para `prod` enquanto o segundo build não passar.

## Estado inicial

A integração está sendo preparada na `main`. Não houve publicação no Netlify nem alteração da branch `prod` nesta etapa.

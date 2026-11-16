# Morados

Morados é um aplicativo privado para duas pessoas construírem uma vida compartilhada: conversar, publicar momentos, guardar memórias, organizar planos, explorar uma casa ilustrada e jogar juntas.

O produto é pensado para funcionar como uma experiência de aplicativo em Android e navegador, com dados e sincronização no projeto Supabase próprio.

## Módulos

- **Feed:** publicações, fotos, áudio e conteúdo do casal.
- **Conversa:** mensagens, anexos, áudio, preferências e interface de chamada.
- **Memórias:** registros privados e compartilhados.
- **Planos:** calendário e compromissos.
- **Casa:** ambiente ilustrado e explorável.
- **Jogos:** catálogo de jogos individuais, locais e com suporte online.
- **Perfil e pareamento:** dados pessoais, mídia e vínculo entre as duas contas.

## Stack

- React 19 e TypeScript
- Vite 8 e Tailwind CSS 4
- TanStack Router e TanStack Query
- Supabase para autenticação, dados, mídia e recursos em tempo real
- Capacitor 8 para Android
- Vitest e Testing Library para testes automatizados

## Desenvolvimento

O projeto usa Bun e mantém o lockfile `bun.lock`.

```sh
bun install
bun run dev
```

Comandos de qualidade e compilação:

```sh
bun run test
bun run lint
bun run build
bun run build:android-web
```

Para sincronizar os assets web e plugins nativos do Capacitor:

```sh
bun run cap:sync
```

A configuração de ambiente deve apontar para o projeto Supabase próprio. Não colocar chaves privadas ou segredos no código do cliente ou no repositório.

## Android

O APK é gerado pelo workflow [Build Morados Capacitor Android APK](.github/workflows/build-android.yml), acionado por alterações relevantes na branch principal. O workflow constrói os assets web locais, sincroniza o Capacitor, compila e verifica a assinatura do APK antes de publicar a release.

As releases Android ficam em [GitHub Releases](https://github.com/cainalo/namoro-com-ia/releases).

## Arquitetura

- `src/routes/`: rotas do aplicativo.
- `src/components/`: telas e componentes dos módulos.
- `src/lib/`: regras de negócio, integração e operações de domínio.
- `src/integrations/supabase/`: clientes e tipos do Supabase.
- `src/test/` e arquivos `*.test.*`: testes automatizados.
- `supabase/migrations/`: mudanças versionadas do banco, quando aplicável.

## Transformação do produto

A auditoria inicial e os princípios de transformação estão documentados em [docs/TRANSFORMACAO_MORADOS.md](docs/TRANSFORMACAO_MORADOS.md). A prioridade é construir uma identidade autoral coerente sem uniformizar os módulos nem comprometer os fluxos existentes.

O desenvolvimento é controlado pelo repositório e pelos workflows do GitHub. Não é necessário depender de geração automática de código por um editor visual.

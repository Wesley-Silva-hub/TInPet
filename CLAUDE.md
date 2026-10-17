# TinPet — guia para Claude Code

App de match entre pets + chat + marketplace. Monorepo pnpm: `apps/api` (Fastify + Prisma 7), `apps/web` (React + Vite), `packages/shared` (schemas Zod compartilhados).

## Comandos

- `pnpm dev`: API (:3333) + web (:5173, com proxy de `/api` para a API)
- `pnpm test`, `pnpm lint`, `pnpm lint:fix`, `pnpm typecheck`, `pnpm build`
- `pnpm db:migrate`: depois de mudar `apps/api/prisma/schema.prisma` (`prisma migrate dev --name <nome>` dentro de `apps/api`)
- `pnpm db:seed`: recria dados de demonstração (senha `tinpet123`)
- Teste de um arquivo: `pnpm --filter @tinpet/api exec vitest run src/modules/pets`

Antes de dizer que terminou: `pnpm lint && pnpm typecheck && pnpm test`.

## Regras do projeto

- **Toda entrada validada com Zod.** Schemas de request/response ficam em `packages/shared/src` e são usados pela rota (Fastify) e pelo formulário (React Hook Form).
- **Respostas também têm schema.** O serializer remove campos fora do schema; é isso que impede vazar e-mail, data de nascimento ou coordenadas. Converta registros com os mappers de `apps/api/src/shared/dto.ts`.
- **Nunca expor lat/lng** de outros usuários: só `distanceKm`. Coordenadas são salvas arredondadas (`roundCoordinate`).
- **Camadas:** `routes.ts` (HTTP, schema, auth) → `service.ts` (regra de negócio e autorização) → Prisma. Sem regra de negócio na rota.
- **Autorização por posse** no service (dono do pet, participante do match, empresa dona do produto). Erros com os helpers de `shared/errors.ts` (`notFound`, `forbidden`, `badRequest`, `conflict`).
- **Arquivos:** o banco guarda só a chave; a URL vem de `storage.publicUrl(key)`. Imagens passam por `processImage` (remove EXIF).
- **Preço em centavos (int).** Nunca float.
- **Teste junto com a feature.** Testes de integração usam `app.inject` e banco real (`src/test/helpers.ts`); cubra a regra que, se quebrar, quebra o produto.
- **Nunca commitar `.env`** nem segredos. Variável nova: adicione em `.env.example` e valide em `apps/api/src/shared/env.ts`.
- Sem `console.log` (Biome bloqueia), sem código comentado, sem TODO sem issue.
- Dependência nova só com justificativa no PR.

## Convenções

- Código e nomes em **inglês**; textos de interface, mensagens de erro, comentários e commits em **português**.
- Banco: tabelas/colunas `snake_case` (`@@map`/`@map`), models PascalCase, ids `uuid`.
- API versionada em `/api/v1`; erro sempre `{ error: { code, message, details? } }`.
- Web organizado por feature (`src/features/<feature>`); `components/ui` só para o que é reutilizado de verdade.
- Commits: Conventional Commits (`feat(web): ...`, `fix(api): ...`), assunto em minúscula. O hook `commit-msg` valida.

## Armadilhas conhecidas

- Prisma 7: o client é gerado em `apps/api/src/generated` (`pnpm install` já roda `prisma generate`) e a URL das migrations vem de `prisma.config.ts` (`DIRECT_URL` ou `DATABASE_URL`).
- Não coloque `NODE_ENV` no `.env`: o Vite lê o mesmo arquivo e geraria o React de desenvolvimento no build.
- WebSocket não passa pelo proxy do Netlify (`netlify.toml`): em produção o front usa `VITE_SOCKET_URL` apontando para a API.

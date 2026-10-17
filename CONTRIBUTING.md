# Contribuindo com o TinPet

## Rodar o projeto

Siga o passo a passo do [README](README.md#-rodando-localmente-10-minutos). Problemas comuns:

- **Porta 5432 ocupada:** já existe um Postgres na máquina. Pare-o ou mude a porta no `docker-compose.yml` e no `.env`.
- **`pnpm` não encontrado:** `npm i -g pnpm`.
- **Erro de permissão no PowerShell:** `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.

## Fluxo de trabalho

1. Pegue uma issue no quadro do GitHub Projects e se atribua.
2. Crie uma branch curta a partir da `main` atualizada:
   `feat/`, `fix/`, `chore/`, `docs/`, `refactor/` ou `test/` + descrição. Exemplo: `feat/feed-filtro-raca`.
3. Faça commits pequenos no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em português e com o assunto em minúscula:
   - `feat(api): adiciona filtro por porte no feed`
   - `fix(web): corrige scroll do chat no iOS`
   - `docs: explica deploy na VPS`
4. Rode `pnpm lint && pnpm typecheck && pnpm test` antes de abrir o PR. Os hooks já formatam os arquivos e validam a mensagem do commit.
5. Abra o PR para a `main` preenchendo o template. O merge é feito por **squash**, depois de CI verde e 1 aprovação.

## Checklist de revisão

- [ ] Resolve a issue sem escopo extra
- [ ] Regra de negócio no service, não na rota; autorização por posse verificada
- [ ] Entradas e respostas com schema Zod em `packages/shared`
- [ ] Testes para a regra nova ou o bug corrigido
- [ ] Migration criada se o schema mudou (e nenhuma migration antiga editada)
- [ ] Telas com estados de carregamento, vazio e erro; funciona no celular e com teclado
- [ ] Nenhum dado pessoal novo exposto em resposta ou log

## Mudanças no banco

1. Edite `apps/api/prisma/schema.prisma`.
2. `cd apps/api && pnpm exec prisma migrate dev --name descricao_curta`
3. Commite o schema **e** a pasta da migration gerada.

Nunca edite uma migration que já está na `main`: crie outra.

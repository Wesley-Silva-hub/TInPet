# 0002 — Stack e versões

**Status:** aceito · 2026-10

## Decisão

- **Fastify 5 + fastify-type-provider-zod** em vez de Express: validação e serialização pelos mesmos schemas Zod, OpenAPI gerado automaticamente, `inject` para testes sem abrir porta. O serializer por schema também impede vazar campos.
- **Testes de rota com `app.inject`** (nativo do Fastify) em vez de Supertest: uma dependência a menos, mesmo resultado.
- **Prisma 7.10** com driver adapter `@prisma/adapter-pg`. O Prisma 8 ainda está em release candidate.
- **TypeScript 6.0**, e não o 7: o TS 7 é o port nativo em Go, e ferramentas do ecossistema ainda estão se adaptando. Reavaliar quando o Dependabot sugerir.
- **React Router 7** (modo biblioteca), a última major com API estável conhecida pelo time; a v8 pode ser adotada num PR próprio.
- **Bundle da API com tsdown**: inclui `@tinpet/shared` e o Prisma Client gerado num único arquivo; dependências npm ficam externas.
- **`node --watch` + loader do tsx** no dev da API: o `tsx watch` não iniciava sob `pnpm --parallel` no Windows.
- **sharp** para validar e reprocessar imagens no servidor (tipo real, redimensionamento, remoção de EXIF); **argon2** para senhas; **jose** para JWT.

## Consequências

Versões fixadas no `package.json` (atualizações via Dependabot, agrupadas semanalmente).

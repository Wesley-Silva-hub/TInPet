# 0001 — Supabase apenas como Postgres e Storage

**Status:** aceito · 2026-10

## Contexto

Precisamos de custo zero agora e de migrar para uma VPS depois sem reescrever código. O Supabase oferece muito além do banco (Auth, RLS, Edge Functions, Realtime, `supabase-js` no front), mas cada recurso usado vira dependência difícil de levar para a VPS.

## Decisão

- Usar o Supabase **só** como Postgres gerenciado e armazenamento de arquivos.
- O banco é acessado apenas via Prisma (`DATABASE_URL` pelo pooler em modo transação, `DIRECT_URL` para migrations).
- Arquivos passam pela interface `StorageProvider` (`apps/api/src/shared/storage`), com implementações `supabase` (API REST, sem `supabase-js`), `s3` (VPS/AWS/R2) e `local` (desenvolvimento), escolhidas por `STORAGE_DRIVER`.
- Autenticação, autorização e tempo real ficam na nossa API (JWT próprio e Socket.IO).
- O banco guarda só a **chave** do arquivo; a URL é montada pelo provider. Trocar de storage não exige migrar dados no banco.

## Consequências

- A migração para a VPS é `pg_dump`/`pg_restore` + cópia dos arquivos + troca de variáveis ([deploy-vps.md](../deploy-vps.md)).
- Abrimos mão de recursos prontos do Supabase (Auth com provedores sociais, Realtime). Se precisarmos deles, revisitar esta decisão.

# 🐾 TinPet

**Bem-vindo ao TinPet!**
O TinPet é uma aplicação web que conecta tutores de animais de estimação: os pets dão "match" (para amizade ou cruzamento), os tutores conversam em tempo real, e empresas anunciam produtos para pets num marketplace.

## 🌟 Funcionalidades

- **Cadastro e login** com consentimento explícito (termos e localização)
- **Feed com swipe** de pets compatíveis, ordenado por distância aproximada
- **Match** quando os dois lados curtem, e **chat em tempo real** entre os tutores
- **Perfil do tutor** (idade, estado civil, profissão, bio, foto) e vários pets por conta
- **Marketplace**: empresas anunciam ração, acessórios e serviços
- **Segurança e LGPD**: bloquear/denunciar, localização arredondada (~1 km), exportação e exclusão real dos dados

## 🛠️ Stack

| | |
|---|---|
| Monorepo | pnpm workspaces · Node 22 · TypeScript strict |
| API | Fastify 5 · Zod · Prisma 7 (PostgreSQL) · Socket.IO · pino |
| Web | React 19 · Vite · Tailwind CSS 4 · TanStack Query · React Hook Form · React Router |
| Qualidade | Biome · Vitest · Lefthook + commitlint · GitHub Actions |
| Hospedagem (grátis) | Supabase (Postgres + Storage) · Render (API) · Vercel (web) |

Decisões e diagramas: [docs/arquitetura.md](docs/arquitetura.md) e [docs/adr/](docs/adr/).

## 🚀 Rodando localmente (≈10 minutos)

Pré-requisitos: **Node 22+**, **pnpm 10** (`npm i -g pnpm`) e **Docker**.

```bash
git clone https://github.com/Wesley-Silva-hub/TInPet.git
cd TInPet
pnpm install
cp .env.example .env              # no Windows (PowerShell): copy .env.example .env
docker compose up -d              # Postgres local
pnpm db:migrate && pnpm db:seed   # cria as tabelas e dados de demonstração
pnpm dev                          # API em :3333 e web em http://localhost:5173
```

Contas de demonstração (senha `tinpet123`): `ana@tinpet.dev`, `bruno@tinpet.dev`, `felipe@tinpet.dev` (tutores) e `pet@tinpet.dev` (empresa).
Dica: entre como Ana e curta o **Rex** para ver um match acontecer na hora.

Documentação interativa da API: http://localhost:3333/api/docs

### Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe API e web juntos |
| `pnpm test` | Testes (a API usa o banco `TEST_DATABASE_URL`) |
| `pnpm lint` / `pnpm lint:fix` | Biome (lint + formatação) |
| `pnpm typecheck` | TypeScript em todos os pacotes |
| `pnpm build` | Build de produção |
| `pnpm db:migrate` | Cria/aplica migrations (desenvolvimento) |
| `pnpm db:seed` | Recria os dados de demonstração |
| `pnpm db:studio` | Prisma Studio |

## 📁 Estrutura

```
apps/api        API Fastify (módulos por feature em src/modules)
apps/web        App React (telas por feature em src/features)
packages/shared Schemas Zod e tipos usados pela API e pelo web
docs/           Arquitetura, ADRs, deploy e documentação original (docs/notion)
```

## 🌍 Deploy

- Grátis (Supabase + Render + Vercel): [docs/deploy-gratuito.md](docs/deploy-gratuito.md)
- VPS própria com Docker: [docs/deploy-vps.md](docs/deploy-vps.md)

## 🏥 Ideias futuras

Acompanhamento de saúde do pet (vacinas, consultas), dog walker e app mobile (React Native reaproveitando `packages/shared`). Veja [docs/backlog.md](docs/backlog.md).

## 🤝 Contribuindo

Leia o [CONTRIBUTING.md](CONTRIBUTING.md). Quem usa Claude Code: o [CLAUDE.md](CLAUDE.md) traz as convenções do projeto.

## 📄 Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

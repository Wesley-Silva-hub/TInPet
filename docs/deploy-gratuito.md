# Deploy gratuito: Supabase + Render + Vercel

```
Navegador ──► Vercel (front estático) ──rewrite /api/*──► Render (API Docker) ──► Supabase (Postgres + Storage)
          └──────────── WebSocket direto ───────────────►
```

Ordem: **Supabase → Render → Vercel → ajustes finais**. Quem tiver acesso às contas faz os passos marcados com 👤; o resto já está no repositório.

## Limites dos planos grátis (conferidos em 2026-10-17)

| Serviço | Limites que importam |
|---|---|
| **Supabase Free** ([pricing](https://supabase.com/pricing)) | 500 MB de banco, 1 GB de storage, 5 GB de egress, upload de até 50 MB, 2 projetos ativos. **Pausa após 7 dias sem atividade** e **não tem backup automático**. |
| **Render Free** ([docs](https://render.com/docs/free)) | **Hiberna após 15 min sem tráfego** e leva cerca de 1 min para acordar (inclusive conexões WebSocket). 750 horas de instância por mês. |
| **Vercel Hobby** ([limits](https://vercel.com/docs/limits)) | Uso **não comercial**. Rewrites para origem externa têm timeout de 120 s e **não encaminham WebSocket**. Só conecta a repositórios de contas pessoais (não de organizações do GitHub). |

Consequências práticas:
- A primeira requisição depois de um tempo parado fica lenta (Render acordando). Um monitor de uptime gratuito chamando `/api/v1/health` a cada 10 min mantém a API acordada e também gera atividade no banco, evitando a pausa do Supabase. Isso gasta as 750 h do mês (dá para um serviço 24/7).
- **Faça backup manual do banco** (passo 5): o plano grátis não tem.
- Se o projeto virar comercial, a Vercel exige o plano Pro (ou use Cloudflare Pages).

## 1. Supabase 👤

1. Crie o projeto em https://supabase.com/dashboard escolhendo a região **East US (North Virginia)**, a mesma do Render (`virginia`), para as consultas serem rápidas. Guarde a senha do banco.
2. **Storage → New bucket**: nome `tinpet`, marque **Public bucket**.
3. **Connect** (botão no topo): copie a string do **Session pooler** (porta 5432), no formato
   `postgresql://postgres.<ref>:<senha>@<pooler-host>:5432/postgres`.
   - Usamos o *session pooler* para a API e para as migrations: a conexão direta do plano grátis é só IPv6 (o Render usa IPv4), e o Supabase recomenda o modo sessão para servidores de longa duração. Os parâmetros `pgbouncer=true&connection_limit=1` eram do Prisma 6 e não se aplicam ao Prisma 7 com driver adapter.
   - Senha com caracteres especiais precisa ser codificada em URL.
4. **Project Settings → API Keys**: copie a **secret key** (`sb_secret_...`) e a **Project URL** (`https://<ref>.supabase.co`). A secret key só fica no Render, nunca no front.

> Não habilite Supabase Auth nem use o client `supabase-js` no front ([ADR 0001](adr/0001-supabase-so-postgres-e-storage.md)).

## 2. Render (API) 👤

1. Garanta que a branch padrão do repositório é `main` (o `render.yaml` publica a partir dela).
2. https://dashboard.render.com → **New → Blueprint** → selecione o repositório. O [`render.yaml`](../render.yaml) cria o serviço `tinpet-api` (Docker, plano free, health check em `/api/v1/health`, deploy só depois do CI verde) e gera o `JWT_SECRET` sozinho.
3. Preencha as variáveis pedidas:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string do session pooler (passo 1.3) |
| `DIRECT_URL` | a mesma string |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_KEY` | secret key |
| `CORS_ORIGINS` | URL da Vercel, ex.: `https://tinpet.vercel.app` (preencha depois do passo 3) |

4. O deploy aplica as migrations (`prisma migrate deploy`) antes de subir a API. Confira `https://<servico>.onrender.com/api/v1/health` → `{"status":"ok"}`.
5. (Opcional) Dados de demonstração: rode localmente apontando para o Supabase: `DATABASE_URL="<session pooler>" STORAGE_DRIVER=supabase SUPABASE_URL=... SUPABASE_SERVICE_KEY=... pnpm db:seed`. Não faça isso com usuários reais na base: o seed apaga as contas `@tinpet.dev`.

## 3. Vercel (web) 👤

1. Edite [`apps/web/vercel.json`](../apps/web/vercel.json) trocando `tinpet-api.onrender.com` pela URL real do serviço no Render e faça commit (PR).
2. https://vercel.com/new → importe o repositório:
   - **Root Directory:** `apps/web` (a Vercel detecta Vite e o pnpm workspace)
   - **Environment Variable:** `VITE_SOCKET_URL=https://<servico>.onrender.com`
3. Deploy. Previews são criados automaticamente para cada PR.
4. Volte ao Render e ajuste `CORS_ORIGINS` com a URL final da Vercel (separe várias por vírgula se usar domínio próprio). Isso libera o WebSocket, que conecta direto no Render.

O front chama `/api/*` na própria Vercel, que repassa ao Render: para o navegador é a mesma origem, e o cookie de sessão funciona sem configuração extra.

## 4. Verificação

- Abra o site, crie uma conta, permita a localização e cadastre um pet com foto.
- Em outra janela anônima, crie outra conta e curta o pet: o match deve aparecer nas duas sessões e o chat entregar mensagens na hora.
- Em Configurações, teste "Exportar meus dados".

## 5. Backup manual (plano grátis) 👤

Semanalmente, ou antes de mudanças grandes:

```bash
pg_dump "<session pooler>" --schema=public --format=custom --no-owner --file=tinpet-$(date +%F).dump
```

Guarde os arquivos fora do repositório (eles contêm dados pessoais).

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Primeira requisição demora ~1 min | Render acordando; normal no plano grátis |
| API não sobe: "Variáveis de ambiente inválidas" | Faltou variável; o log lista quais |
| Chat não atualiza em tempo real | `VITE_SOCKET_URL` ausente na Vercel ou origem fora de `CORS_ORIGINS` |
| Fotos não aparecem | Bucket `tinpet` não está público |
| `prepared statement already exists` | Usou a porta 6543 (modo transação); use o session pooler (5432) |

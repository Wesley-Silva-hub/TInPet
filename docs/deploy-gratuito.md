# Deploy gratuito: Supabase + Render + Netlify

```
Navegador ──► Netlify (front estático) ──proxy /api/*──► Render (API Docker) ──► Supabase (Postgres + Storage)
          └──────────── WebSocket direto ───────────────►
```

Ordem: **Supabase → Render → Netlify → ajustes finais**. Quem tiver acesso às contas faz os passos marcados com 👤; o resto já está no repositório.

## Limites dos planos grátis (conferidos em 2026-10-17)

| Serviço | Limites que importam |
|---|---|
| **Supabase Free** ([pricing](https://supabase.com/pricing)) | 500 MB de banco, 1 GB de storage, 5 GB de egress, upload de até 50 MB, 2 projetos ativos. **Pausa após 7 dias sem atividade** e **não tem backup automático**. |
| **Render Free** ([docs](https://render.com/docs/free)) | **Hiberna após 15 min sem tráfego** e leva cerca de 1 min para acordar (inclusive conexões WebSocket). 750 horas de instância por mês. |
| **Netlify Free** ([créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)) | 300 créditos/mês: **cada deploy de produção gasta 15** (≈20 por mês), banda 20 créditos/GB, 2 créditos a cada 10 mil requisições. Deploy previews de PR não gastam. **Se os créditos acabarem, o site sai do ar até o mês seguinte.** O proxy para a API corta requisições em **26 s**. |

Consequências práticas:
- A primeira requisição depois de um tempo parado fica lenta (Render acordando). Um monitor de uptime gratuito chamando `/api/v1/health` a cada 10 min mantém a API acordada e também gera atividade no banco, evitando a pausa do Supabase. Isso gasta as 750 h do mês (dá para um serviço 24/7).
- **Faça backup manual do banco** (passo 5): o plano grátis não tem.
- O `netlify.toml` pula o build quando o front não mudou (mudanças só na API não gastam créditos). Mesmo assim, junte vários PRs antes de publicar se o mês estiver apertado: o consumo aparece em *Team settings → Usage*.
- Com o Render dormindo, a primeira chamada pelo proxy do Netlify pode estourar os 26 s: é mais um motivo para o monitor de uptime.

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
| `CORS_ORIGINS` | URL do Netlify, ex.: `https://tinpet.netlify.app` (preencha depois do passo 3) |

4. O deploy aplica as migrations (`prisma migrate deploy`) antes de subir a API. Confira `https://<servico>.onrender.com/api/v1/health` → `{"status":"ok"}`.
5. (Opcional) Dados de demonstração: rode localmente apontando para o Supabase: `DATABASE_URL="<session pooler>" STORAGE_DRIVER=supabase SUPABASE_URL=... SUPABASE_SERVICE_KEY=... pnpm db:seed`. Não faça isso com usuários reais na base: o seed apaga as contas `@tinpet.dev`.

## 3. Netlify (web) 👤

1. Edite o [`netlify.toml`](../netlify.toml) trocando `tinpet-api.onrender.com` pela URL real do serviço no Render e faça commit (PR).
2. https://app.netlify.com → **Add new project → Import an existing project → GitHub** → autorize e escolha `Wesley-Silva-hub/TInPet`.
   - **Branch to deploy:** `main`
   - Deixe *Base directory* em branco: build, pasta publicada e proxy já vêm do `netlify.toml` na raiz.
3. Em **Environment variables**, adicione `VITE_SOCKET_URL=https://<servico>.onrender.com` e dispare um novo deploy (*Deploys → Trigger deploy*).
4. (Opcional) *Site configuration → Change site name* para algo como `tinpet` → `https://tinpet.netlify.app`.
5. Volte ao Render e ajuste `CORS_ORIGINS` com a URL final do Netlify (separe várias por vírgula se usar domínio próprio). Isso libera o WebSocket, que conecta direto no Render.

O front chama `/api/*` no próprio Netlify, que repassa ao Render: para o navegador é a mesma origem, e o cookie de sessão funciona sem configuração extra. Cada PR ganha um *Deploy Preview* com link próprio (sem gastar créditos).

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
| Chat não atualiza em tempo real | `VITE_SOCKET_URL` ausente no Netlify ou origem fora de `CORS_ORIGINS` |
| Erro 502/504 no login logo após um tempo parado | Render acordando (mais de 26 s); tente de novo em 1 min e configure o monitor de uptime |
| "Site not available" no Netlify | Créditos do mês acabaram; volta no próximo ciclo |
| Fotos não aparecem | Bucket `tinpet` não está público |
| `prepared statement already exists` | Usou a porta 6543 (modo transação); use o session pooler (5432) |

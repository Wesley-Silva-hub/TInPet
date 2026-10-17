# Deploy em VPS (Docker)

Guia para sair do plano grátis e rodar tudo numa VPS Ubuntu: Postgres, storage S3 (RustFS), API e Caddy (HTTPS automático) via [`docker-compose.prod.yml`](../docker-compose.prod.yml). O código não muda: só as variáveis de ambiente.

> ⚠️ O compose de produção não foi executado durante a reconstrução (a máquina de desenvolvimento não tinha Docker). Faça o primeiro deploy num servidor de teste e rode a [verificação](#6-verificação).

Requisitos: VPS com 2 GB de RAM (1 GB funciona com swap), um domínio e acesso ao DNS.

## 1. Provisionar e endurecer o servidor

```bash
# como root, na primeira vez
adduser deploy && usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/ && chown -R deploy: /home/deploy/.ssh

# SSH só por chave e sem root
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

# Firewall: só SSH e web
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw enable

# Atualizações automáticas e proteção contra força bruta
apt update && apt install -y unattended-upgrades fail2ban
```

Teste o login como `deploy` **em outro terminal** antes de fechar a sessão root.

## 2. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy   # saia e entre de novo
```

## 3. Configurar o projeto

```bash
git clone https://github.com/Wesley-Silva-hub/TInPet.git tinpet && cd tinpet
```

DNS: crie registros **A** para `APP_DOMAIN` e `FILES_DOMAIN` apontando para o IP da VPS.

Crie `.env.prod` (nunca versionado; o `.gitignore` já cobre `.env.*`):

```dotenv
APP_DOMAIN=tinpet.seudominio.com.br
FILES_DOMAIN=arquivos.tinpet.seudominio.com.br

POSTGRES_PASSWORD=<gere: openssl rand -base64 32 | tr -d '/+='>
DATABASE_URL=postgresql://tinpet:<mesma senha>@postgres:5432/tinpet
DIRECT_URL=postgresql://tinpet:<mesma senha>@postgres:5432/tinpet

JWT_SECRET=<gere: openssl rand -base64 48>
CORS_ORIGINS=https://tinpet.seudominio.com.br

RUSTFS_ACCESS_KEY=tinpet
RUSTFS_SECRET_KEY=<gere: openssl rand -base64 32>
S3_ACCESS_KEY_ID=tinpet
S3_SECRET_ACCESS_KEY=<mesmo valor de RUSTFS_SECRET_KEY>
S3_BUCKET=tinpet
S3_PUBLIC_URL=https://arquivos.tinpet.seudominio.com.br/tinpet

BACKUP_RETENTION_DAYS=14
```

### Front: duas opções

- **A. Front na VPS (mesma origem, recomendado):** gere o build e deixe em `apps/web/dist`, que o Caddy serve:
  ```bash
  corepack enable && pnpm install --frozen-lockfile && pnpm --filter @tinpet/web build
  ```
  (Ou gere o build no seu computador/CI e copie a pasta `apps/web/dist` com `rsync`.)
- **B. Front continua na Vercel:** em `apps/web/vercel.json`, aponte o rewrite para `https://<APP_DOMAIN>/api/:path*` e defina `VITE_SOCKET_URL=https://<APP_DOMAIN>` na Vercel. Inclua a URL da Vercel em `CORS_ORIGINS`.

## 4. Subir

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api   # aguarde "Server listening"
```

Crie o bucket público (uma vez):

```bash
source .env.prod
docker run --rm --network tinpet_default \
  -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
  amazon/aws-cli --endpoint-url http://s3:9000 s3 mb s3://tinpet

docker run --rm --network tinpet_default \
  -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
  amazon/aws-cli --endpoint-url http://s3:9000 s3api put-bucket-policy --bucket tinpet --policy \
  '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::tinpet/*"}]}'
```

## 5. Migrar os dados do Supabase

Faça numa janela de manutenção (os usuários ficam sem acesso por alguns minutos).

1. **Congele escritas:** no Render, suspenda o serviço `tinpet-api`.
2. **Banco:** só o schema `public` (onde estão nossas tabelas e o histórico de migrations do Prisma):
   ```bash
   pg_dump "<session pooler do Supabase>" --schema=public --format=custom --no-owner --no-privileges --file=supabase.dump
   docker compose -f docker-compose.prod.yml stop api
   docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U tinpet -d tinpet --clean --if-exists --no-owner < supabase.dump
   docker compose -f docker-compose.prod.yml start api
   ```
3. **Arquivos:** o Supabase Storage é compatível com S3. Com o [rclone](https://rclone.org/) instalado na VPS:
   ```bash
   # Supabase: Project Settings → Storage → S3 Connection (gere access key/secret)
   rclone config create supabase s3 provider=Other endpoint=https://<ref>.storage.supabase.co/storage/v1/s3 \
     access_key_id=<id> secret_access_key=<secret> region=<região do projeto>
   rclone config create vps s3 provider=Other endpoint=https://<FILES_DOMAIN> \
     access_key_id=tinpet secret_access_key=<RUSTFS_SECRET_KEY>
   rclone sync supabase:tinpet vps:tinpet --progress
   ```
   As chaves dos arquivos são as mesmas; como o banco guarda só a chave, as URLs passam a apontar para o novo storage sozinhas.
4. **DNS/front:** aponte o front para a VPS (opção A ou B acima).
5. Valide (passo 6). Mantenha o projeto Supabase pausado por algumas semanas como contingência antes de apagá-lo.

## 6. Verificação

```bash
curl https://<APP_DOMAIN>/api/v1/health            # {"status":"ok"}
docker compose -f docker-compose.prod.yml ps        # todos "running"/"healthy"
docker compose -f docker-compose.prod.yml logs backup | tail -3   # "backup ok"
```

No navegador: login, feed com fotos, match e chat em tempo real.

## Backups

O serviço `backup` gera um `pg_dump` por dia em `./backups` e apaga os mais antigos que `BACKUP_RETENTION_DAYS`. **Copie os backups para fora da VPS** (outro provedor ou bucket), senão uma perda do servidor leva junto os backups:

```bash
# exemplo diário no crontab do usuário deploy
0 4 * * * rclone copy /home/deploy/tinpet/backups remoto:tinpet-backups --max-age 48h
```

Restaurar um backup:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U tinpet -d tinpet --clean --if-exists --no-owner < backups/tinpet-AAAAMMDD-HHMMSS.dump
```

Teste a restauração periodicamente num banco descartável.

## Atualizar e reverter

```bash
git pull && docker compose -f docker-compose.prod.yml up -d --build api   # migrations rodam no start
```

Rollback:
1. `git checkout <tag anterior>` (ex.: `v0.1.0`) e `docker compose -f docker-compose.prod.yml up -d --build api`.
2. Se a versão nova aplicou migration incompatível, restaure o backup feito antes do deploy. Por isso: **backup manual antes de todo deploy com migration**.
3. Na migração Supabase → VPS, o rollback é reativar o serviço no Render e voltar o DNS/rewrite: o Supabase continua com os dados do momento do congelamento.

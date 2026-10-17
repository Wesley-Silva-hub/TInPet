# Backlog e divisão do time

O MVP (auth, perfil, pets, feed/swipe/match, chat, marketplace, LGPD) está implementado. As issues abaixo levam o projeto até a publicação e preparam a próxima fase. Crie-as no GitHub (manualmente ou com o script no fim) e organize num **GitHub Projects** com as colunas *Backlog → Pronto para fazer → Em andamento → Em revisão → Feito*.

## Divisão inicial (4 pessoas)

Cada pessoa é **dona** de um módulo (revisa os PRs dele e conhece as regras), mas todos podem trabalhar em qualquer parte.

| Pessoa | Módulos | Onde fica |
|---|---|---|
| 1 | Auth, perfil, LGPD, configurações | `api/modules/{auth,users}`, `web/features/{auth,profile}` |
| 2 | Pets, feed, swipe, match, segurança (bloqueio/denúncia) | `api/modules/{pets,matching,safety}`, `web/features/feed` |
| 3 | Chat e tempo real | `api/modules/chat`, `api/shared/realtime.ts`, `web/features/{matches,chat}` |
| 4 | Marketplace, infra e deploy (CI, Render, Vercel, VPS) | `api/modules/products`, `web/features/marketplace`, `docs/deploy-*`, `.github/` |

## Issues

Labels sugeridas: `infra`, `api`, `web`, `segurança`, `lgpd`, `ux`, `futuro`. Marco: **v0.1.0 — publicação** e **v0.2.0**.

### v0.1.0 — publicação

1. **[infra] Proteger a branch `main` e renomear `producao`** — Renomear a branch padrão para `main`; exigir PR, CI verde e 1 aprovação; habilitar squash merge e apagar branches após o merge. *Aceite:* push direto na `main` é bloqueado.
2. **[infra] Criar projeto Supabase e bucket** — Seguir [deploy-gratuito.md](deploy-gratuito.md) §1. *Aceite:* strings do pooler e secret key guardadas no gerenciador de senhas do time.
3. **[infra] Publicar a API no Render via Blueprint** — §2. *Aceite:* `/api/v1/health` responde `ok`.
4. **[infra] Publicar o front na Vercel** — §3, incluindo `VITE_SOCKET_URL` e `CORS_ORIGINS`. *Aceite:* fluxo completo de match e chat em produção.
5. **[infra] Monitor de uptime** — Configurar um monitor gratuito chamando `/api/v1/health` a cada 10 min (evita hibernação e pausa do Supabase). *Aceite:* alerta por e-mail quando cair.
6. **[web] Testar em celulares reais** — iOS Safari e Android Chrome: swipe, upload de foto pela câmera, chat com teclado aberto. *Aceite:* bugs encontrados viram issues.
7. **[web][ux] Revisão de acessibilidade** — Navegação só por teclado, leitor de tela (NVDA/VoiceOver) e contraste no tema escuro. *Aceite:* nenhum bloqueio nas telas principais.
8. **[lgpd] Revisar termos e política de privacidade** — O texto em `/termos` é um resumo técnico; precisa de revisão (idealmente por alguém da área jurídica) e de um contato do controlador dos dados. *Aceite:* versão revisada publicada.
9. **[infra] Tag `v0.1.0`** — Após a publicação. *Aceite:* release no GitHub com notas.

### v0.2.0

10. **[api][web] Esqueci minha senha** — Tabela de tokens de redefinição (reusar `newOpaqueToken`/`hashToken`), envio de e-mail (avaliar Resend/Brevo no plano grátis), tela de nova senha. *Aceite:* token expira em 30 min e é de uso único.
11. **[api][segurança] Painel de moderação** — Listar denúncias para `ADMIN`, marcar como resolvidas e suspender contas. *Aceite:* só `ADMIN` acessa.
12. **[api][web] Filtros do feed** — Raio de distância, porte e raça na interface (a API já aceita `maxDistanceKm`). *Aceite:* filtros persistem por pet.
13. **[web] Reordenar fotos do pet** — Arrastar para definir a foto principal. *Aceite:* ordem refletida no feed.
14. **[api] Sair de todos os dispositivos** — Revogar todos os refresh tokens do usuário. *Aceite:* outras sessões precisam logar de novo.
15. **[web] PWA** — Manifesto e instalação na tela inicial (base para notificações push). *Aceite:* instalável no Android.
16. **[api] Limpeza de tokens expirados** — Rotina que apaga `refresh_tokens` vencidos há mais de 30 dias.

### Futuro (só arquitetura preparada)

17. **[futuro] Saúde do pet** — Carteira de vacinação, consultas e lembretes (módulo `health` ligado a `pets`).
18. **[futuro] Dog walker** — Novo papel de usuário e agendamento de passeios.
19. **[futuro] App mobile (React Native)** — Reaproveitar `packages/shared`; definir o fluxo de refresh token para mobile.
20. **[futuro] Feed social** — Postagens e interações do MER original (`Postagem`, `Acao`).

## Criar as issues com o GitHub CLI

Com o [`gh`](https://cli.github.com/) autenticado (`gh auth login`):

```bash
gh label create infra --color 0E8A16; gh label create api --color 1D76DB; gh label create web --color 5319E7
gh label create segurança --color B60205; gh label create lgpd --color D93F0B; gh label create ux --color FBCA04
gh label create futuro --color C5DEF5
gh issue create --title "Proteger a branch main e renomear producao" --label infra --body "Ver docs/backlog.md, item 1."
# ...repita para os demais itens
```

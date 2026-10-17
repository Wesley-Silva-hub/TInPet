# 0005 — Autenticação com JWT curto e refresh token rotativo

**Status:** aceito · 2026-10

## Decisão

- **Access token** JWT HS256 de 15 minutos, mantido só em memória no front (não fica em `localStorage`, então XSS não o rouba de forma persistente).
- **Refresh token** opaco (32 bytes aleatórios) em cookie `httpOnly`, `Secure` em produção, `SameSite=Lax` e `Path=/api/v1/auth`. O banco guarda só o hash SHA-256.
- **Rotação** a cada uso. Reuso de um token já rotacionado revoga a família inteira, exceto numa janela de 30 s para requisições simultâneas legítimas (várias abas).
- O front chama a API pela mesma origem (proxy do Vite em dev, proxy do Netlify em produção), então o cookie é first-party.
- O Socket.IO autentica com o mesmo access token no handshake.
- Senhas com argon2id; o login com e-mail inexistente gasta o mesmo tempo (evita enumeração de contas).

## Consequências

- Se o front e a API ficarem em domínios diferentes sem proxy, é preciso `COOKIE_SAMESITE=none` + HTTPS e incluir a origem em `CORS_ORIGINS`.
- Logout revoga a família da sessão atual; "sair de todos os dispositivos" é uma extensão simples (revogar por `user_id`).

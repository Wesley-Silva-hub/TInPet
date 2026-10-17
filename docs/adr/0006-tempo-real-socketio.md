# 0006 — Tempo real com Socket.IO na própria API

**Status:** aceito · 2026-10

## Decisão

Socket.IO no mesmo processo da API (`path: /api/socket.io`), em vez do Supabase Realtime. É portável para a VPS e reaproveita a mesma autorização dos endpoints HTTP.

## Consequências

- **Rewrites da Vercel não encaminham WebSocket.** Em produção gratuita o front conecta direto na URL do Render (`VITE_SOCKET_URL`), autenticando pelo token (não depende de cookie). A origem do front precisa estar em `CORS_ORIGINS`.
- Uma única instância da API basta nesta fase. Para várias instâncias, adicionar o adapter Redis do Socket.IO.
- O plano grátis do Render hiberna sem tráfego; a primeira conexão após a hibernação demora cerca de 1 minuto.

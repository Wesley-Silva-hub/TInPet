# 0004 — Distância com Haversine em SQL (sem PostGIS)

**Status:** aceito · 2026-10

## Contexto

O feed ordena pets pela distância entre os tutores. As opções eram PostGIS (índice geoespacial) ou a fórmula de Haversine em SQL puro.

## Decisão

Haversine em SQL (`$queryRaw` tipado em `modules/matching/service.ts`), com um filtro prévio por faixa de latitude que usa o índice `(latitude, longitude)`.

- Roda em qualquer Postgres (Supabase, CI, VPS, Postgres embutido) sem extensão.
- A precisão de 1 km (coordenadas arredondadas por privacidade) torna desnecessária a exatidão do PostGIS.
- O volume esperado na fase atual (milhares de pets) é bem atendido.

## Quando revisitar

Se o feed passar de ~100 mil pets ativos ou surgirem buscas por raio mais complexas: migrar para PostGIS (`geography(Point)` + índice GiST). Supabase e a imagem `postgis/postgis` suportam.

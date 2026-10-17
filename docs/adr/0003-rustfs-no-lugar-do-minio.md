# 0003 — RustFS no lugar do MinIO

**Status:** aceito · 2026-10

## Contexto

O plano original usava MinIO como storage S3 na VPS. A MinIO deixou de publicar imagens Docker da edição community (a imagem `minio/minio` não está mais disponível no Docker Hub).

## Decisão

Usar **RustFS** (`rustfs/rustfs`, Apache-2.0), servidor compatível com a API S3 e com a mesma ergonomia do MinIO (portas 9000/9001, chaves por variável de ambiente). O código não muda: o `S3StorageProvider` usa o SDK oficial da AWS e funciona com qualquer serviço S3.

## Consequências

- Se o RustFS não atender, as alternativas são SeaweedFS, Garage ou um S3 gerenciado (Cloudflare R2 tem plano grátis): só mudam as variáveis `S3_*`.
- A configuração do compose não pôde ser testada localmente na reconstrução (sem Docker na máquina); valide no primeiro deploy.

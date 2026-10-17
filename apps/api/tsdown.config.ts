import { defineConfig } from 'tsdown'

// Bundle de produção: inclui o código do monorepo (@tinpet/shared, Prisma Client gerado);
// dependências do npm ficam externas e são instaladas na imagem.
export default defineConfig({
  entry: ['src/server.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  dts: false,
  deps: { alwaysBundle: [/^@tinpet\//] },
})

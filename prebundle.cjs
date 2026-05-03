/* eslint-disable */
// Bu script Docker build sırasında çalışır, Remotion bundle'ını önceden hazırlar.
const { bundle } = require('@remotion/bundler');
const { writeFileSync, cpSync, mkdirSync } = require('fs');
const { join } = require('path');

const root = process.cwd();

console.log('[prebundle] Remotion bundle hazırlanıyor...');

bundle({
  entryPoint: join(root, 'src/remotion/index.tsx'),
  publicDir: join(root, 'public'),
  outDir: join(root, 'remotion-bundle'),
  webpackOverride: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        '@': join(root, 'src'),
      },
    },
  }),
  onProgress: (progress) => {
    process.stdout.write('\r[prebundle] %' + Math.round(progress * 100));
  },
}).then((url) => {
  console.log('\n[prebundle] Tamamlandı:', url);
  writeFileSync(join(root, '.remotion-bundle-url'), url, 'utf-8');

  // Cloud Run renderer'ların HTTP üzerinden erişebilmesi için public/ altına kopyala
  const dest = join(root, 'public', 'remotion-bundle');
  mkdirSync(dest, { recursive: true });
  cpSync(join(root, 'remotion-bundle'), dest, { recursive: true });
  console.log('[prebundle] public/remotion-bundle/ kopyalandı');
}).catch((err) => {
  console.error('[prebundle] HATA:', err);
  process.exit(1);
});

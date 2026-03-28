import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(__dirname, '..', 'src', 'lib', 'pdf-generator.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'bundle.js'),
  format: 'iife',
  globalName: 'FortunePDF',
  platform: 'browser',
  target: 'es2020',
  external: ['jspdf'],
  alias: {
    '@/lib': path.join(__dirname, '..', 'src', 'lib'),
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
});

console.log('✅ bundle.js 생성 완료');

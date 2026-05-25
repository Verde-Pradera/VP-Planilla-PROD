'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, 'src', 'backend', '.env.supabase');
const OUTPUT = path.join(ROOT, 'docker', 'seed-prod.sql');

if (!fs.existsSync(ENV_FILE)) {
  console.error('ERROR: src/backend/.env.supabase no existe.');
  console.error('Crea ese archivo con las credenciales de Supabase primero.');
  process.exit(1);
}

const envContent = fs.readFileSync(ENV_FILE, 'utf8');
const match = envContent.match(/^DIRECT_URL="?([^"\n]+)"?/m);
if (!match) {
  console.error('ERROR: DIRECT_URL no encontrado en .env.supabase');
  process.exit(1);
}
const url = match[1].trim();

console.log('Conectando a Supabase via pg_dump...');

const result = spawnSync('docker', [
  'run', '--rm',
  'postgres:16-alpine',
  'pg_dump',
  '--data-only',
  '--no-owner',
  '--no-privileges',
  '--schema=verdepradera',
  '--exclude-table=_prisma_migrations',
  url,
], { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });

if (result.error) {
  console.error('Error ejecutando docker:', result.error.message);
  process.exit(1);
}
if (result.status !== 0) {
  console.error('pg_dump falló:\n', result.stderr);
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, result.stdout, 'utf8');

const kb = (result.stdout.length / 1024).toFixed(1);
console.log(`Listo. ${kb} KB guardados en docker/seed-prod.sql`);
console.log('');
console.log('Para aplicarlos en Docker:');
console.log('  docker compose down -v');
console.log('  docker compose --profile seed up --build');

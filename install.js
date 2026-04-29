#!/usr/bin/env node
/**
 * AetherWave Cross-Platform Installer (install.js)
 * -------------------------------------------------
 * Node-based installer for Linux/macOS/Windows. Mirrors install.sh logic but
 * runs anywhere Node.js is available. Useful when bash is unavailable
 * (e.g. some Synology DSM containers, Windows WSL boundary issues).
 *
 * Usage:
 *   node install.js [--branch <branch>] [--device <type>] [--no-pull]
 *
 * Supported branches: main, test, dev
 * Supported devices:  INTEL_QUICKSYNC, NVIDIA_CUDA, CPU_ONLY
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── Colors ──────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  red:    '\x1b[0;31m',
  green:  '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue:   '\x1b[0;34m',
  purple: '\x1b[0;35m',
};

const log    = (m) => console.log(`${C.blue}[INFO]${C.reset} ${m}`);
const ok     = (m) => console.log(`${C.green}[ OK ]${C.reset} ${m}`);
const warn   = (m) => console.log(`${C.yellow}[WARN]${C.reset} ${m}`);
const err    = (m) => console.error(`${C.red}[FAIL]${C.reset} ${m}`);
const header = (m) => console.log(`\n${C.purple}═══ ${m} ═══${C.reset}\n`);

// ─── CLI Args ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
let BRANCH = 'main';
let DEVICE_TYPE = '';
let NO_PULL = false;

for (let i = 0; i < argv.length; i++) {
  switch (argv[i]) {
    case '--branch':   BRANCH = argv[++i]; break;
    case '--device':   DEVICE_TYPE = argv[++i]; break;
    case '--no-pull':  NO_PULL = true; break;
    case '-h':
    case '--help':
      console.log(fs.readFileSync(__filename, 'utf-8')
        .split('\n').filter(l => l.startsWith(' *') || l.startsWith('/**'))
        .map(l => l.replace(/^[\s*\/]+/, '')).join('\n'));
      process.exit(0);
      break;
    default:
      err(`Unknown argument: ${argv[i]}`);
      process.exit(1);
  }
}

const VALID_BRANCHES = ['main', 'test', 'dev'];
if (!VALID_BRANCHES.includes(BRANCH)) {
  err(`Invalid branch '${BRANCH}'. Supported: ${VALID_BRANCHES.join(', ')}`);
  process.exit(1);
}

const PROJECT_DIR = path.resolve(__dirname);

// ─── Helpers ─────────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', cwd: PROJECT_DIR }).toString();
  } catch (e) {
    if (!opts.allowFail) throw e;
    return null;
  }
}

function has(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(which, [cmd], { stdio: 'pipe' });
  return r.status === 0;
}

function detectDevice() {
  // NVIDIA?
  if (has('nvidia-smi') && spawnSync('nvidia-smi', [], { stdio: 'pipe' }).status === 0) {
    return 'NVIDIA_CUDA';
  }
  // Intel QuickSync (Linux only)
  if (process.platform === 'linux' && fs.existsSync('/dev/dri/renderD128')) {
    return 'INTEL_QUICKSYNC';
  }
  return 'CPU_ONLY';
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function patchEnv(key, value) {
  const envPath = path.join(PROJECT_DIR, '.env');
  let content = fs.readFileSync(envPath, 'utf-8');
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) {
    content = content.replace(re, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content);
}

// ─── Main ────────────────────────────────────────────────────────────────
header(`AetherWave Installer (Node) — branch: ${BRANCH}`);
log(`Project dir: ${PROJECT_DIR}`);
log(`Platform:    ${process.platform} ${os.arch()}`);
log(`Node:        ${process.version}`);

// Phase 1: Prerequisites
header('Phase 1: Prerequisites');
if (!has('docker')) { err('Docker not installed'); process.exit(1); }
let DC_CMD = '';
if (has('docker-compose')) {
  DC_CMD = 'docker-compose';
} else if (has('docker') && run('docker compose version', { silent: true, allowFail: true })) {
  DC_CMD = 'docker compose';
} else {
  err('docker-compose not found');
  process.exit(1);
}
if (!has('git')) { err('git not installed'); process.exit(1); }
ok('All prerequisites present');

// Phase 2: Hardware
header('Phase 2: Hardware Detection');
if (!DEVICE_TYPE) {
  DEVICE_TYPE = detectDevice();
  if (DEVICE_TYPE === 'CPU_ONLY') warn('No GPU detected; using CPU (slower synthesis)');
  else ok(`Detected: ${DEVICE_TYPE}`);
} else {
  log(`Device type (manual): ${DEVICE_TYPE}`);
}

// Phase 3: Branch Sync
if (!NO_PULL) {
  header(`Phase 3: Sync to branch '${BRANCH}'`);
  run(`git fetch origin ${BRANCH}`, { allowFail: true, silent: true });
  const branchExists = run('git branch --list ' + BRANCH, { silent: true, allowFail: true });
  if (branchExists && branchExists.trim()) {
    run(`git checkout ${BRANCH}`);
    run(`git pull origin ${BRANCH}`, { allowFail: true });
  } else {
    const r = run(`git checkout -b ${BRANCH} origin/${BRANCH}`, { allowFail: true, silent: true });
    if (r === null) warn(`Branch ${BRANCH} not found remotely — staying on current`);
  }
  const current = run('git rev-parse --abbrev-ref HEAD', { silent: true }).trim();
  ok(`On branch: ${current}`);
}

// Phase 4: Volumes
header('Phase 4: Volume Setup');
for (const vol of ['radio_vault', 'persona_db', 'market_ingest', 'redis_data', 'data']) {
  ensureDir(path.join(PROJECT_DIR, vol));
  ok(`Created: ${vol}/`);
}

// Phase 5: Environment
header('Phase 5: Environment Configuration');
const envPath = path.join(PROJECT_DIR, '.env');
const exPath  = path.join(PROJECT_DIR, '.env.example');
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(exPath, envPath);
  ok('Created .env from .env.example');
}
patchEnv('DEVICE_TYPE', DEVICE_TYPE);
ok(`DEVICE_TYPE set to ${DEVICE_TYPE}`);

if (process.platform !== 'win32') {
  fs.chmodSync(envPath, 0o600);
  ok('.env permissions: 0600');
}

const envContent = fs.readFileSync(envPath, 'utf-8');
if (envContent.includes('your-api-key-here')) {
  warn('GOOGLE_API_KEY not set — edit .env before launching');
}

// Phase 6: Docker Images
header('Phase 6: Docker Images');
if (BRANCH === 'dev') {
  log('Building from source (dev mode)…');
  run(`${DC_CMD} build`);
} else {
  log('Pulling images…');
  const pullResult = run(`${DC_CMD} pull`, { allowFail: true, silent: true });
  if (pullResult === null) {
    warn('Pull failed; building from source');
    run(`${DC_CMD} build`);
  }
}
ok('Docker images ready');

// Phase 7: Validation
header('Phase 7: Compose Validation');
const validate = run(`${DC_CMD} config`, { silent: true, allowFail: true });
if (validate === null) {
  err('docker-compose.yml has syntax errors');
  process.exit(1);
}
ok('docker-compose.yml is valid');

// Final
header('Installation Complete');
console.log('Branch:        ' + C.green + BRANCH + C.reset);
console.log('Device:        ' + C.green + DEVICE_TYPE + C.reset);
console.log('Project dir:   ' + C.blue + PROJECT_DIR + C.reset);
console.log('');
console.log('Next steps:');
console.log('  1. Edit .env and set GOOGLE_API_KEY');
console.log('  2. Run: ' + C.yellow + `${DC_CMD} up -d` + C.reset);
console.log('  3. Open: ' + C.yellow + 'http://localhost:8080' + C.reset);

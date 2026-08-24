import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = [
  '.ai.constitution.md', '.ai.memory.md',
  'docs/ai-library/CURRENT_STATE.md', 'docs/ai-library/ARCHITECTURE_INDEX.md',
  'docs/ai-library/OWNERSHIP_REGISTRY.md', 'docs/ai-library/SECURITY_BASELINE.md',
  'docs/ai-library/RELEASE_LEDGER.md', 'docs/ai-library/DECISION_LOG.md'
];
const fail = msg => { console.error(`AI_MEMORY_GUARD_FAIL: ${msg}`); process.exitCode = 1; };
for (const file of required) if (!fs.existsSync(file) || fs.statSync(file).size < 20) fail(`missing/empty ${file}`);

const memory = fs.readFileSync('.ai.memory.md','utf8');
for (const file of required.slice(2)) if (!memory.includes(file)) fail(`bootstrap does not reference ${file}`);

const base = process.env.AI_MEMORY_BASE || 'HEAD^';
let changed = [];
try { changed = execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean); }
catch { console.log('AI_MEMORY_GUARD: diff unavailable; structural checks only'); }

const material = changed.some(p =>
  p.startsWith('supabase/') || p.startsWith('admin/') || p.startsWith('shop/') ||
  p.startsWith('.github/workflows/') || /(^|\/)(package(-lock)?\.json|.*\.(js|mjs|cjs|ts|tsx|sql))$/.test(p)
);
const memoryChanged = changed.some(p => p === '.ai.memory.md' || p.startsWith('docs/ai-library/'));
if (material && !memoryChanged) fail('material platform change without durable-memory update');

const domains = ['commerce','customer','order','invoice','payment'];
for (const domain of domains) {
  const touched = changed.some(p => p.toLowerCase().includes(domain));
  if (touched && !changed.includes(`docs/ai-library/domains/${domain}.md`) && !memoryChanged) {
    fail(`${domain} changed without domain memory consideration`);
  }
}
if (!process.exitCode) console.log(`AI_MEMORY_GUARD_GREEN: ${changed.length} changed file(s) checked`);

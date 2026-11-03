import fs from 'fs'
import { doctor as kernelDoctor, verify, MODEL } from '../services/sovereignKernel.js'
import { getAllEntries } from '../services/auditLog.js'

// node scripts/doctor.js            -> full check (needs Ollama running with the model pulled)
// node scripts/doctor.js --offline  -> CI mode: static + audit-chain checks only
const offline = process.argv.includes('--offline')
let failed = false
const ok = m => console.log('  PASS ', m)
const bad = m => { console.error('  FAIL ', m); failed = true }

console.log('DOCTOR: Sovereign SI' + (offline ? ' (offline/CI)' : ''))

try { const d = kernelDoctor(); ok(`policy: ${d.mode} / LOCAL_ONLY / default=${d.default}`) }
catch (e) { bad('kernel policy: ' + e.message) }

try {
  const e = getAllEntries()
  const v = verify(e)
  v.ok ? ok(`audit chain valid (${e.length} entries)`) : bad(`audit chain broken at ts=${v.brokenAt}`)
} catch (e) { bad('audit log unreadable: ' + e.message) }

if (!fs.existsSync('LICENSE')) console.log('  WARN  no LICENSE file in repo root')

if (!offline) {
  try {
    const r = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(3000), redirect: 'error' })
    if (!r.ok) throw new Error('status ' + r.status)
    const names = ((await r.json()).models || []).map(m => m.name)
    names.includes(MODEL) ? ok(`Ollama reachable, ${MODEL} is pulled`) : bad(`Ollama reachable but ${MODEL} not pulled -> run: ollama pull ${MODEL}`)
  } catch (e) { bad('Ollama not reachable on 127.0.0.1:11434: ' + e.message) }
}

console.log(failed ? 'DOCTOR FAIL' : 'DOCTOR PASS')
process.exit(failed ? 1 : 0)

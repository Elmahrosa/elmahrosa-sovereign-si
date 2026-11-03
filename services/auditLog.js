import fs from 'fs'
import path from 'path'

// Resolved lazily so tests can point at a temp file via TEOS_AUDIT_PATH.
const auditPath = () => process.env.TEOS_AUDIT_PATH || path.join(process.cwd(), 'data', 'sovereign-audit.jsonl')

export class AuditCorruptError extends Error {
  constructor(msg) { super(msg); this.code = 'AUDIT_CORRUPT' }
}

// FAIL-CLOSED: a missing log is a fresh chain; a damaged log is an error, never a silent restart at GENESIS.
export function getLastHash() {
  const p = auditPath()
  if (!fs.existsSync(p)) return 'GENESIS'
  const content = fs.readFileSync(p, 'utf8').trim()
  if (!content) return 'GENESIS'
  const lines = content.split('\n').filter(Boolean)
  try {
    const last = JSON.parse(lines[lines.length - 1])
    if (typeof last.hash !== 'string' || !last.hash) throw new Error('no hash')
    return last.hash
  } catch {
    throw new AuditCorruptError('audit log is corrupt - refusing to continue (fail-closed)')
  }
}

export function getAllEntries() {
  const p = auditPath()
  if (!fs.existsSync(p)) return []
  return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
}

export function append(entry) {
  if (!entry.ts) throw new Error('ts required - must come from kernel')
  if (!entry.hash) throw new Error('hash required')
  const p = auditPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.appendFileSync(p, JSON.stringify(entry) + '\n', 'utf8')
  return entry
}

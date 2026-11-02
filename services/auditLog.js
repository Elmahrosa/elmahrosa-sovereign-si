import fs from 'fs'
import path from 'path'

const AUDIT_PATH = path.join(process.cwd(), 'data', 'sovereign-audit.jsonl')

export function getLastHash() {
  try {
    if (!fs.existsSync(AUDIT_PATH)) return 'GENESIS'
    const content = fs.readFileSync(AUDIT_PATH, 'utf8').trim()
    if (!content) return 'GENESIS'
    const lines = content.split('\n').filter(Boolean)
    if (!lines.length) return 'GENESIS'
    return JSON.parse(lines[lines.length-1]).hash
  } catch { return 'GENESIS' }
}

export function getAllEntries() {
  if (!fs.existsSync(AUDIT_PATH)) return []
  return fs.readFileSync(AUDIT_PATH, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
}

export function append(entry) {
  if (!entry.ts) throw new Error('ts required - must come from kernel (deterministic fix)')
  if (!entry.hash) throw new Error('hash required')
  // FIX CRITICAL: لا تعمل Date.now() هنا أبداً - استخدم نفس ts اللي اتحسب بيه الهاش
  fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true })
  fs.appendFileSync(AUDIT_PATH, JSON.stringify(entry) + '\n', 'utf8')
  return entry
}

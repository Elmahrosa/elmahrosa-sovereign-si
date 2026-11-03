// VERSION: 1.0.0-LOCKED - Sovereign SI Kernel
// Model-Agnostic - Strongest Open AI Local - EGYPT_ONLY

import crypto from 'crypto'
import { append as auditAppend, getLastHash } from './auditLog.js'

export const MODE = 'EGYPT_ONLY'
export const LOCAL_ONLY = true
export const failClosed = true

// أيمن: مش مربوط ببلد - مربوط بالأقوى - Qwen default
export const MODEL_REGISTRY = {
  'qwen3:8b': { id: 'qwen3:8b', type: 'brain', size: '5.2GB', local: true, provider: 'ollama', default: true, description: 'Sovereign Node - Alexandria, Egypt' },
  'qwen3-30b-a3b': { id: 'Qwen/Qwen3-30B-A3B', type: 'code-agent', params: '30.5B total / 3.3B active', license: 'Apache-2.0', status: 'installed', why: '91% of 235B flagship, 10x cheaper' },
  'qwen3-235b-a22b': { id: 'Qwen/Qwen3-235B-A22B', type: 'flagship-moe', params: '235B/22B active', license: 'Qwen', status: 'optional', why: 'neck-to-neck Gemini 2.5 Pro' },
  'qwen3-asr-1.7b': { id: 'Qwen/Qwen3-ASR-1.7B', type: 'asr-ear', params: '1.7B', langs: 201, status: 'ear-default', why: 'strongest open ASR > Whisper' },
  'qwen3-asr-0.6b': { id: 'Qwen/Qwen3-ASR-0.6B', type: 'asr-fast', params: '0.6B', status: 'real-time' },
  'falcon-arabic': { id: 'tiiuae/Falcon-Arabic-34B', type: 'fallback', note: 'Egyptian dialect heavy tasks' },
  'jais-3-37b': { id: 'core42/jais-3-37b', type: 'fallback', note: 'legacy Emirati' },
  'deepseek-v3': { id: 'deepseek-ai/DeepSeek-V3', type: 'code-fallback', note: 'code heavy' },
}

export const MODEL = 'qwen3:8b'
export const ASR_MODEL = 'qwen3-asr-1.7b'

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export function redactPII(text) {
  if (!text) return ''
  return text.slice(0, 500).replace(/\b\d{14}\b/g, '[NID]').replace(/\b01\d{9}\b/g, '[PHONE]').replace(/\b\d{16}\b/g, '[CARD]')
}

export function doctor() {
  if (MODE !== 'EGYPT_ONLY') throw new Error('MODE_INVALID')
  if (!LOCAL_ONLY) throw new Error('LOCAL_ONLY_REQUIRED')
  if (!MODEL_REGISTRY[MODEL]) throw new Error('MODEL_UNAVAILABLE')
  return { mode: MODE, local: LOCAL_ONLY, default: MODEL, asr: ASR_MODEL, models: Object.keys(MODEL_REGISTRY).length, locked: '1.0.0-LOCKED' }
}

export function verify(entries) {
  let prev = 'GENESIS'
  for (const e of entries) {
    const recomputed = sha256(`${prev}:${e.prompt}:${e.response}:${e.ts}`)
    if (recomputed !== e.hash) return { ok: false, brokenAt: e.ts, reason: 'CHAIN_BROKEN' }
    prev = e.hash
  }
  return { ok: true }
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])

// Calls the LOCAL Ollama server only. Refuses any non-loopback URL (EGYPT_ONLY / LOCAL_ONLY).
async function callOllama(prompt, url) {
  let u
  try { u = new URL(url) } catch {
    throw Object.assign(new Error('Blocked: invalid engine URL'), { code: 'POLICY_BLOCKED' })
  }
  if (u.protocol !== 'http:' || !LOOPBACK_HOSTS.has(u.hostname) || u.username || u.password) {
    throw Object.assign(new Error('Blocked: engine must be loopback'), { code: 'POLICY_BLOCKED' })
  }
  let r
  try {
    r = await fetch(u.origin + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        think: false
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(120000)
    })
  } catch (e) {
    throw Object.assign(new Error(`MODEL_UNAVAILABLE: ${e.message}`), { code: 'MODEL_UNAVAILABLE' })
  }
  if (!r.ok) throw Object.assign(new Error(`MODEL_ERROR: ollama status ${r.status}`), { code: 'MODEL_ERROR' })
  let data
  try { data = await r.json() } catch {
    throw Object.assign(new Error('MODEL_BAD_RESPONSE: not JSON'), { code: 'MODEL_BAD_RESPONSE' })
  }
  const text = data && data.message && data.message.content
  if (typeof text !== 'string') {
    throw Object.assign(new Error('MODEL_BAD_RESPONSE: no message.content'), { code: 'MODEL_BAD_RESPONSE' })
  }
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

// chat('text')            -> offline deterministic stub (used by tests, simulated: true)
// chat({ prompt, url })   -> real answer from the local model, audited
export async function chat(input) {
  if (MODE !== 'EGYPT_ONLY') throw Object.assign(new Error('Blocked'), { code: 'POLICY_BLOCKED' })
  const { prompt, url } = typeof input === 'string' ? { prompt: input, url: undefined } : (input || {})
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw Object.assign(new Error('prompt required'), { code: 'BAD_REQUEST' })
  }

  // Model call first: the read-hash + append below must stay synchronous (no await in between).
  const reply = url ? await callOllama(prompt, url) : null

  const prevHash = getLastHash()
  const ts = Date.now() // SINGLE SOURCE - FIX CRITICAL #2
  const storedPrompt = redactPII(prompt)
  const storedResponse = reply === null
    ? `[${MODEL} local] ${prompt.slice(0,100)}... response`.slice(0,2000)
    : redactPII(reply)
  const hash = sha256(`${prevHash}:${storedPrompt}:${storedResponse}:${ts}`)
  const entry = { prevHash, prompt: storedPrompt, response: storedResponse, ts, hash, model: MODEL, mode: MODE }
  auditAppend(entry)
  return reply === null
    ? { response: storedResponse, audit: entry, model: MODEL, simulated: true }
    : { response: reply, audit: entry, model: MODEL }
}

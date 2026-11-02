import fs from 'fs'
import { doctor as kernelDoctor } from '../services/sovereignKernel.js'

console.log('DOCTOR: Checking Sovereign SI...')
try {
  const result = kernelDoctor()
  console.log(`DOCTOR: ${result.mode} - LOCAL_ONLY - ${result.models} models - default=${result.default} - OK`)
  
  // check files
  const kernel = fs.readFileSync('services/sovereignKernel.js','utf8')
  if (!kernel.includes('1.0.0-LOCKED')) throw new Error('VERSION marker missing')
  if (!kernel.includes('MODEL_REGISTRY')) throw new Error('MODEL_REGISTRY missing')
  if (!kernel.includes('failClosed')) throw new Error('failClosed missing')
  if (kernel.length < 1000) throw new Error('kernel too small')
  
  console.log('BEHAVIORAL PASS')
} catch (e) {
  console.error('DOCTOR FAIL:', e.message)
  process.exit(1)
}

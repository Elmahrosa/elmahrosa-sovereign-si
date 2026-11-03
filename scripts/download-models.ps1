# Elmahrosa Sovereign SI - one-time model setup (needs internet ONCE; afterwards fully offline)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Error 'Ollama is not installed. Install it from https://ollama.com first.'
}
Write-Host 'Pulling default model qwen3:8b (~5.2 GB)...'
ollama pull qwen3:8b
Write-Host 'Done. Verify with: npm run doctor'

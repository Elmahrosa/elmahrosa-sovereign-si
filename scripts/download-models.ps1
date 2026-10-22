# Elmahrosa Sovereign SI — Download open weights locally
# Run once on Egyptian server, then disconnect network if desired.

$ErrorActionPreference = "Stop"
$modelsRoot = if ($env:SOVEREIGN_MODELS_PATH) { $env:SOVEREIGN_MODELS_PATH } else { ".\models" }
New-Item -ItemType Directory -Force -Path $modelsRoot | Out-Null

Write-Host "Downloading available open models to $modelsRoot ..."

# Jais 3 7B (fully available)
huggingface-cli download inception42/Jais-3-7B --local-dir "$modelsRoot\jais-3-7b" --local-dir-use-symlinks False

# Jais-ASR (19 dialects)
huggingface-cli download IFM/Jais-ASR --local-dir "$modelsRoot\jais-asr" --local-dir-use-symlinks False

# Falcon-OCR-Arabic (confirm exact repo when published)
# huggingface-cli download tiiuae/Falcon-OCR-Arabic --local-dir "$modelsRoot\falcon-ocr-arabic"

Write-Host "Done. Falcon-ASR and Falcon-Emirati weights may still be pending — check TII HF orgs."
Write-Host "Quantize with llama.cpp if needed for Damanhur hardware."

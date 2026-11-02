# Elmahrosa Sovereign SI - Download Strongest Local Models
# Requires: huggingface-cli (pip install huggingface_hub[cli])

$modelsDir = ".\models"
New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null

Write-Host "Downloading Qwen3-27B (default brain) - Apache 2.0..."
huggingface-cli download Qwen/Qwen3-27B --local-dir "$modelsDir/qwen3-27b" --local-dir-use-symlinks False

Write-Host "Downloading Qwen3-30B-A3B (code-agent, 3.3B active)..."
huggingface-cli download Qwen/Qwen3-30B-A3B --local-dir "$modelsDir/qwen3-30b-a3b" --local-dir-use-symlinks False

Write-Host "Downloading Qwen3-ASR-1.7B (ear, 201 langs)..."
huggingface-cli download Qwen/Qwen3-ASR-1.7B --local-dir "$modelsDir/qwen3-asr-1.7b" --local-dir-use-symlinks False

Write-Host "All strongest models local - EGYPT_ONLY"

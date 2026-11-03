# Reproducible release zip: built from git (forward-slash paths, includes tests + CI), hash printed.
$ErrorActionPreference = 'Stop'
$ver = (Get-Content package.json | ConvertFrom-Json).version
New-Item -ItemType Directory -Force dist | Out-Null
$out = "dist/elmahrosa-sovereign-si-v$ver.zip"
git archive --format=zip --prefix="elmahrosa-sovereign-si/" -o $out HEAD
$h = (Get-FileHash $out -Algorithm SHA256).Hash
"$h  $(Split-Path $out -Leaf)" | Set-Content "$out.sha256"
Write-Host "Built $out`nSHA256 $h`nAttach BOTH files to the GitHub release; never commit the zip."

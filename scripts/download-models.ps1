[CmdletBinding()]
param([string]$ModelsPath="./models",[string]$ManifestPath="./models/manifest.json",[string[]]$Only=@())
$manifest=Get-Content $ManifestPath -Raw | ConvertFrom-Json
function Get-FileSha256($Path){$s=[Security.Cryptography.SHA256]::Create();$st=[IO.File]::OpenRead($Path);try{($s.ComputeHash($st)|%{$_.ToString('x2')})-join''}finally{$st.Dispose()}}
foreach($p in $manifest.models.PSObject.Properties){
 $id=$p.Name; $e=$p.Value
 if($Only.Count -gt 0 -and $Only -notcontains $id){continue}
 $t=Join-Path $ModelsPath $e.file
 if((Test-Path $t) -and (Get-FileSha256 $t)-eq $e.sha256){Write-Host "[ok] $id verified" -F Green;continue}
 Write-Host "[get] $id : $($e.url)" -F Cyan
 Invoke-WebRequest -Uri $e.url -OutFile $t -UseBasicParsing
 $a=Get-FileSha256 $t
 if($a -ne $e.sha256){Remove-Item $t -Force;Write-Host "[FAIL] sha mismatch" -F Red;exit 2}
 Write-Host "[done] $id verified at $t" -F Green
}

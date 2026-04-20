param(
    [string]$Owner = 'schrazen',
    [string]$Repo = 'Emotion-Adaptive',
    [string]$TargetFolder = (Join-Path $PSScriptRoot '..\release')
)

$ErrorActionPreference = 'Stop'

$apiUrl = "https://api.github.com/repos/$Owner/$Repo/releases/latest"
$headers = @{ 'User-Agent' = 'Emotion-Adaptive-Installer' }
$release = Invoke-RestMethod -Uri $apiUrl -Headers $headers

$asset = $release.assets | Where-Object { $_.name -like '*Portable*' -and $_.name -like '*.exe' } | Select-Object -First 1
if (-not $asset) {
    throw 'No portable release asset was found on the latest GitHub release.'
}

New-Item -ItemType Directory -Force -Path $TargetFolder | Out-Null
$outputFile = Join-Path $TargetFolder $asset.name

Invoke-WebRequest -Uri $asset.browser_download_url -Headers $headers -OutFile $outputFile
Write-Host "Downloaded: $outputFile"
Write-Host 'Run the portable exe from the release folder to start the app.'
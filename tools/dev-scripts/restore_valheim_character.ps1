# Valheim Character Inventory Rollback Script
# Restores character 'Knut' to pre-death state (11:20:37 AM) using safety backup

$ErrorActionPreference = 'Stop'

$valheimProc = Get-Process -Name "valheim" -ErrorAction SilentlyContinue
if ($valheimProc) {
    Write-Warning "Valheim is currently running! Please completely close Valheim before running this script."
    exit 1
}

$safetyBackup = "C:\Users\Jared\Valheim_Character_Backups\knut.fch.old"
$steamDir = "C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters"
$targetFch = Join-Path $steamDir "knut.fch"
$targetFchOld = Join-Path $steamDir "knut.fch.old"
$targetBackup = Join-Path $steamDir "knut_backup_auto-20260912-112037.fch"

if (-not (Test-Path $safetyBackup)) {
    Write-Error "Safety backup $safetyBackup not found!"
    exit 1
}

$backupSize = (Get-Item $safetyBackup).Length
Write-Host "Using pre-death safety backup: $safetyBackup ($backupSize bytes)" -ForegroundColor Cyan

# Copy pre-death file to knut.fch, knut.fch.old, and named backup
Copy-Item -Path $safetyBackup -Destination $targetFch -Force
Copy-Item -Path $safetyBackup -Destination $targetFchOld -Force
Copy-Item -Path $safetyBackup -Destination $targetBackup -Force

# Update LastWriteTime so Steam Cloud uploads the local change
$now = [DateTime]::Now
(Get-Item $targetFch).LastWriteTime = $now
(Get-Item $targetFchOld).LastWriteTime = $now
(Get-Item $targetBackup).LastWriteTime = $now

Write-Host "Restored knut.fch ($backupSize bytes)" -ForegroundColor Green
Write-Host "Restored knut.fch.old ($backupSize bytes)" -ForegroundColor Green
Write-Host "Created in-game backup knut_backup_auto-20260912-112037.fch ($backupSize bytes)" -ForegroundColor Green
Write-Host "Timestamp set to: $now" -ForegroundColor Yellow

Get-ChildItem -Path $steamDir -Filter "knut*" | Select-Object Name, Length, LastWriteTime

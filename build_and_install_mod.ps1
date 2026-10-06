# Build and Install script for ValheimLiveBridge BepInEx Plugin

$valheimDir = "D:\SteamLibrary\steamapps\common\Valheim"
if (-not (Test-Path $valheimDir)) {
    # Check C: drive fallback
    $cValheim = "C:\Program Files (x86)\Steam\steamapps\common\Valheim"
    if (Test-Path $cValheim) {
        $valheimDir = $cValheim
    } else {
        Write-Error "Could not locate Valheim installation directory!"
        exit 1
    }
}

Write-Host "Found Valheim at: $valheimDir"

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    Write-Error "csc.exe not found at $csc"
    exit 1
}

$managed = "$valheimDir\valheim_Data\Managed"
$ns = "$managed\netstandard.dll"
$u1 = "$managed\UnityEngine.dll"
$u2 = "$managed\UnityEngine.CoreModule.dll"
$uImg = "$managed\UnityEngine.ImageConversionModule.dll"
$uPhys = "$managed\UnityEngine.PhysicsModule.dll"
$uInput = "$managed\UnityEngine.InputLegacyModule.dll"
$valheim = "$managed\assembly_valheim.dll"
$utils = "$managed\assembly_utils.dll"
$splat = "$managed\Splatform.dll"
$sra = "$managed\SoftReferenceableAssets.dll"

$bep = "$valheimDir\BepInEx\core\BepInEx.dll"
if (-not (Test-Path $bep)) {
    Write-Error "BepInEx not found in $valheimDir\BepInEx\core\BepInEx.dll! Please ensure BepInEx is installed."
    exit 1
}

$source = "$PSScriptRoot\src\mod\ValheimLiveBridgePlugin.cs"
$outputDll = "$valheimDir\BepInEx\plugins\ValheimLiveBridge.dll"
$oldDll = "$valheimDir\BepInEx\plugins\ValheimLiveBridge.dll.old"

if (Test-Path $outputDll) {
    if (Test-Path $oldDll) { Remove-Item $oldDll -Force -ErrorAction SilentlyContinue }
    Rename-Item -Path $outputDll -NewName "ValheimLiveBridge.dll.old" -ErrorAction SilentlyContinue
}

Write-Host "Compiling ValheimLiveBridge.dll..."
& $csc /target:library /out:$outputDll /r:$ns /r:$bep /r:$u1 /r:$u2 /r:$uImg /r:$uPhys /r:$uInput /r:$valheim /r:$utils /r:$splat /r:$sra $source

if (Test-Path $outputDll) {
    Write-Host "SUCCESS: ValheimLiveBridge plugin compiled and installed to:"
    Write-Host "  $outputDll ($((Get-Item $outputDll).Length) bytes)"
} else {
    Write-Error "Compilation failed."
    exit 1
}

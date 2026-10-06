[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\netstandard.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.CoreModule.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_utils.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_valheim.dll")
$t = $asm.GetType("Minimap")

$flags = [System.Reflection.BindingFlags]::Public -bor [System.Reflection.BindingFlags]::NonPublic -bor [System.Reflection.BindingFlags]::Instance -bor [System.Reflection.BindingFlags]::Static

Write-Host "--- TryLoadMinimapTextureData / SaveMapTextureDataToDisk ---"
$m = $t.GetMethod("SaveMapTextureDataToDisk", $flags)
if ($m) { Write-Host "SaveMapTextureDataToDisk: $($m.ToString())" }

$m2 = $t.GetMethod("GetCompleteTexturePath", $flags)
if ($m2) { Write-Host "GetCompleteTexturePath: $($m2.ToString())" }

$m3 = $t.GetMethod("GetMapData", $flags)
if ($m3) { Write-Host "GetMapData: $($m3.ToString())" }

Write-Host "`n--- Checking UnityEngine ImageConversion ---"
$uImage = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.ImageConversionModule.dll"
if (Test-Path $uImage) {
    Write-Host "ImageConversionModule exists!"
    $imgAsm = [System.Reflection.Assembly]::LoadFrom($uImage)
    $ic = $imgAsm.GetType("UnityEngine.ImageConversion")
    $ic.GetMethods() | Where-Object { $_.Name -like "*PNG*" -or $_.Name -like "*JPG*" } | ForEach-Object { Write-Host $_.ToString() }
} else {
    Write-Host "ImageConversionModule not found at $uImage"
}

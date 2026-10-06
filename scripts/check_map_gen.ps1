[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\netstandard.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.CoreModule.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_utils.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_valheim.dll")
$t = $asm.GetType("Minimap")

$flags = [System.Reflection.BindingFlags]::Public -bor [System.Reflection.BindingFlags]::NonPublic -bor [System.Reflection.BindingFlags]::Instance

$generateMapMethod = $t.GetMethod("GenerateWorldMap", $flags)
if ($generateMapMethod) {
    Write-Host "GenerateWorldMap method found: $($generateMapMethod.ToString())"
}

$createMapTexture = $t.GetMethod("CreateMapTexture", $flags)
if ($createMapTexture) {
    Write-Host "CreateMapTexture method found: $($createMapTexture.ToString())"
}

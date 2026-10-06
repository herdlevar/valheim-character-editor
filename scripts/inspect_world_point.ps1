[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\netstandard.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.CoreModule.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_utils.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_valheim.dll")
$t = $asm.GetType("Minimap")

$flags = [System.Reflection.BindingFlags]::Public -bor [System.Reflection.BindingFlags]::NonPublic -bor [System.Reflection.BindingFlags]::Instance

$m = $t.GetMethod("MapPointToWorld", $flags)
if ($m) {
    Write-Host "MapPointToWorld: $($m.ToString())"
    $body = $m.GetMethodBody()
    if ($body) {
        Write-Host "IL bytes length: $($body.GetILAsByteArray().Length)"
    }
}

$m2 = $t.GetMethod("WorldToMapPoint", $flags, $null, @([UnityEngine.Vector3]), $null)
if ($m2) {
    Write-Host "WorldToMapPoint: $($m2.ToString())"
}

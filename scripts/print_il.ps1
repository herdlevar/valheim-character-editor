[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\netstandard.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.CoreModule.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_utils.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_valheim.dll")
$t = $asm.GetType("Minimap")
$flags = [System.Reflection.BindingFlags]::Public -bor [System.Reflection.BindingFlags]::NonPublic -bor [System.Reflection.BindingFlags]::Instance

$methods = @("WorldToMapPoint", "MapPointToWorld")
foreach ($name in $methods) {
    Write-Host "--- $name ---"
    $m = $t.GetMethod($name, $flags)
    if ($m) {
        $body = $m.GetMethodBody()
        if ($body) {
            $bytes = $body.GetILAsByteArray()
            Write-Host ($bytes | ForEach-Object { $_.ToString("X2") }) -Separator " "
        }
    }
}

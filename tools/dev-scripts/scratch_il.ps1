$managed = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed"
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.CoreModule.dll") | Out-Null
$valheim = [System.Reflection.Assembly]::LoadFrom("$managed\assembly_valheim.dll")

$znet = $valheim.GetType("ZNetScene")
$method = $znet.GetMethod("GetPrefab", [Type[]]@([string]))
$body = $method.GetMethodBody()
$il = $body.GetILAsByteArray()
Write-Host "IL bytes length:" $il.Length
# Format IL instructions or check calls
Write-Host ($il | ForEach-Object { "{0:X2}" -f $_ }) -join " "

$managed = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed"
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.CoreModule.dll") | Out-Null
$valheim = [System.Reflection.Assembly]::LoadFrom("$managed\assembly_valheim.dll")

$odb = $valheim.GetType("ObjectDB")
$m = $odb.GetMethod("GetAllBuildPieces")
$body = $m.GetMethodBody()
$il = $body.GetILAsByteArray()
Write-Host "GetAllBuildPieces IL length: " $il.Length
Write-Host ($il | ForEach-Object { "{0:X2}" -f $_ }) -join " "

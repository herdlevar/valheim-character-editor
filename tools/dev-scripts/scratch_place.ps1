$managed = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed"
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.CoreModule.dll") | Out-Null
$valheim = [System.Reflection.Assembly]::LoadFrom("$managed\assembly_valheim.dll")

$player = $valheim.GetType("Player")
$m = $player.GetMethod("PlacePiece", [System.Reflection.BindingFlags]"Public,NonPublic,Instance")
if ($m) {
    Write-Host "PlacePiece parameters:"
    $m.GetParameters() | ForEach-Object { Write-Host "  $($_.ParameterType.Name) $($_.Name)" }
    $il = $m.GetMethodBody().GetILAsByteArray()
    Write-Host "PlacePiece IL length: $($il.Length)"
} else {
    Write-Host "PlacePiece not found, looking for methods with 'Place' in name:"
    $player.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance") | Where-Object { $_.Name -like "*Place*" } | ForEach-Object { Write-Host "  $($_.Name)" }
}

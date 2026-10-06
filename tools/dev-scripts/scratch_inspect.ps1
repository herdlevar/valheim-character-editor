$managed = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed"
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.CoreModule.dll") | Out-Null
$valheim = [System.Reflection.Assembly]::LoadFrom("$managed\assembly_valheim.dll")

Write-Host "Valheim Assembly Loaded."
$znet = $valheim.GetType("ZNetScene")
if ($znet) {
    Write-Host "ZNetScene GetPrefab overloads:"
    $znet.GetMethods() | Where-Object { $_.Name -eq "GetPrefab" } | ForEach-Object {
        $params = ($_.GetParameters() | ForEach-Object { "$($_.ParameterType.Name) $($_.Name)" }) -join ", "
        Write-Host "  $($_.ReturnType.Name) GetPrefab($params)"
    }
    Write-Host "ZNetScene fields:"
    $znet.GetFields([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | ForEach-Object {
        Write-Host "  $($_.FieldType.Name) $($_.Name)"
    }
}
$pt = $valheim.GetType("PieceTable")
if ($pt) {
    Write-Host "PieceTable Fields:"
    $pt.GetFields([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | ForEach-Object {
        Write-Host "  $($_.FieldType.Name) $($_.Name)"
    }
}

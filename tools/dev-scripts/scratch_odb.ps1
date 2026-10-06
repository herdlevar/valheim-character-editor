$managed = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed"
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.CoreModule.dll") | Out-Null
$valheim = [System.Reflection.Assembly]::LoadFrom("$managed\assembly_valheim.dll")

$odb = $valheim.GetType("ObjectDB")
if ($odb) {
    Write-Host "ObjectDB Fields:"
    $odb.GetFields([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | ForEach-Object {
        Write-Host "  $($_.FieldType.Name) $($_.Name)"
    }
    Write-Host "ObjectDB Methods:"
    $odb.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | ForEach-Object {
        Write-Host "  $($_.ReturnType.Name) $($_.Name)"
    }
}

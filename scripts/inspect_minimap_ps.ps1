[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\netstandard.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\UnityEngine.CoreModule.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_utils.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_valheim.dll")
$t = $asm.GetType("Minimap")

Write-Host "--- Minimap Fields ---"
$flags = [System.Reflection.BindingFlags]::Public -bor [System.Reflection.BindingFlags]::NonPublic -bor [System.Reflection.BindingFlags]::Instance -bor [System.Reflection.BindingFlags]::Static
foreach ($f in $t.GetFields($flags)) {
    if ($f.Name -match "texture|map|fog|explored|pixel|forest") {
        Write-Host "$($f.FieldType.Name) $($f.Name)"
    }
}

Write-Host "`n--- Minimap Methods ---"
foreach ($m in $t.GetMethods($flags)) {
    if ($m.Name -match "Texture|Map|Fog|Explore|SaveMap|LoadMap") {
        Write-Host "$($m.ReturnType.Name) $($m.Name)"
    }
}

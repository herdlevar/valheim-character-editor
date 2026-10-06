$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$t = $asm.GetType("PlayerProfile")
Write-Output "PlayerProfile fields:"
$t.GetFields([System.Reflection.BindingFlags]"Public,NonPublic,Instance") | ForEach-Object {
    "$($_.FieldType.Name) $($_.Name)"
}

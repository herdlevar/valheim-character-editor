$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$utils = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_utils.dll")
$v2i = $utils.GetType("Vector2i")
$v2i.GetFields() | ForEach-Object { "$($_.FieldType.Name) $($_.Name)" }

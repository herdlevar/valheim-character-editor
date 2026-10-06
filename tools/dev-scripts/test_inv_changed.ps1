$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$invType = $asm.GetType("Inventory")
$invType.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance") | Where-Object { $_.Name -like "*Change*" } | ForEach-Object { "$($_.ReturnType.Name) $($_.Name)($($_.GetParameters().Length) params)" }

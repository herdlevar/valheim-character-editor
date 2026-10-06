$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$invType = $asm.GetType("Inventory")
Write-Host "Public Fields / Events / Delegates:"
$invType.GetFields([System.Reflection.BindingFlags]"Public,NonPublic,Instance") | Where-Object { $_.Name -like "*change*" } | ForEach-Object { "$($_.FieldType.Name) $($_.Name)" }

$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$invType = $asm.GetType("Inventory")
$m = $invType.GetMethod("Changed", [System.Reflection.BindingFlags]"Public,NonPublic,Instance")
Write-Host "IsPublic: $($m.IsPublic), IsPrivate: $($m.IsPrivate), IsFamily: $($m.IsFamily)"

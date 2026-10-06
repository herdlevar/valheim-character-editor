$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom($dir + '\UnityEngine.dll') | Out-Null
[System.Reflection.Assembly]::LoadFrom($dir + '\UnityEngine.CoreModule.dll') | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom($dir + '\assembly_valheim.dll')
$p = $asm.GetType('Player')
Write-Host '--- Player Fields ---'
$p.GetFields([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | Where-Object { $_.Name -like '*fly*' } | Select-Object Name, FieldType
Write-Host '--- Player Methods ---'
$p.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | Where-Object { $_.Name -like '*fly*' } | Select-Object Name, ReturnType
$c = $asm.GetType('Character')
Write-Host '--- Character Fields ---'
$c.GetFields([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | Where-Object { $_.Name -like '*fly*' } | Select-Object Name, FieldType
Write-Host '--- Character Methods ---'
$c.GetMethods([System.Reflection.BindingFlags]'Public,NonPublic,Instance,Static') | Where-Object { $_.Name -like '*fly*' } | Select-Object Name, ReturnType

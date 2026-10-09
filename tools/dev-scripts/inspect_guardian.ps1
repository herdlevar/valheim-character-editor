$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$playerType = $asm.GetType("Player")
$playerType.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | 
    Where-Object { $_.Name -like "*Guardian*" } | 
    ForEach-Object { $_.ToString() }

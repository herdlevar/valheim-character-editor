$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$invType = $asm.GetType("Inventory")
$invType.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | 
    Where-Object { $_.Name -match "Add|Get|Remove|Clear" } | 
    ForEach-Object { $_.ToString() }

$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$charType = $asm.GetType("Character")
Write-Host "Character GodMode methods & fields:"
$charType.GetMembers([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | 
    Where-Object { $_.Name -like "*God*" -or $_.Name -like "*Ghost*" } | 
    ForEach-Object { "$($_.MemberType) $($_.ToString())" }

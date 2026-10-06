$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$types = $asm.GetTypes()
$pType = $types | Where-Object { $_.Name -eq 'Player' -and $_.IsClass }

Write-Output "Player fields related to visual / appearance / load:"
$pType.GetFields([System.Reflection.BindingFlags]"Public,NonPublic,Instance") | 
    Where-Object { $_.Name -match "hair|beard|skin|model|visual|load|save|color|gender|look" } |
    ForEach-Object { "$($_.FieldType.Name) $($_.Name)" }

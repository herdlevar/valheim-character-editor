try {
    $dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
    [System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
    [System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
    $asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
    
    $itemDataType = $asm.GetType("ItemDrop+ItemData")
    Write-Output "ItemData methods:"
    $itemDataType.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | 
        Where-Object { $_.Name -match "Save|Load" } | 
        ForEach-Object { $_.ToString() }
    
    $invType = $asm.GetType("Inventory")
    Write-Output "`nInventory methods:"
    $invType.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | 
        Where-Object { $_.Name -match "Save|Load" } | 
        ForEach-Object { $_.ToString() }

    $playerType = $asm.GetType("Player")
    Write-Output "`nPlayer methods:"
    $playerType.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | 
        Where-Object { $_.Name -match "Save|Load" } | 
        ForEach-Object { $_.ToString() }

    $profileType = $asm.GetType("PlayerProfile")
    Write-Output "`nPlayerProfile methods:"
    $profileType.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static") | 
        Where-Object { $_.Name -match "Save|Load" } | 
        ForEach-Object { $_.ToString() }

} catch {
    Write-Output "Error: $($_.Exception.ToString())"
}

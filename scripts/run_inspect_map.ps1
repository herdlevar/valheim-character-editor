$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$managed = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed"
& $csc /target:library /out:scripts\inspect_minimap_textures.dll /r:$managed\netstandard.dll /r:$managed\UnityEngine.dll /r:$managed\UnityEngine.CoreModule.dll /r:$managed\assembly_valheim.dll /r:$managed\assembly_utils.dll scripts\inspect_minimap_textures.cs
if ($LASTEXITCODE -eq 0) {
    [System.Reflection.Assembly]::LoadFrom("$managed\netstandard.dll") | Out-Null
    [System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.dll") | Out-Null
    [System.Reflection.Assembly]::LoadFrom("$managed\UnityEngine.CoreModule.dll") | Out-Null
    [System.Reflection.Assembly]::LoadFrom("$managed\assembly_utils.dll") | Out-Null
    [System.Reflection.Assembly]::LoadFrom("$managed\assembly_valheim.dll") | Out-Null
    $asm = [System.Reflection.Assembly]::LoadFrom("$PSScriptRoot\inspect_minimap_textures.dll")
    $type = $asm.GetType("InspectMinimapTextures")
    $type.GetMethod("Run").Invoke($null, $null)
    Write-Host "Inspect finished."
}

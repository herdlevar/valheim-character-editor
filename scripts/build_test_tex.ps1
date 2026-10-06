$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$managed = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed"
& $csc /target:library /out:scripts\test_tex_export.dll /r:$managed\netstandard.dll /r:$managed\UnityEngine.dll /r:$managed\UnityEngine.CoreModule.dll /r:$managed\UnityEngine.ImageConversionModule.dll /r:$managed\assembly_valheim.dll /r:$managed\assembly_utils.dll scripts\test_tex_export.cs
if ($LASTEXITCODE -eq 0) {
    Write-Host "Texture export compile SUCCESS!"
}

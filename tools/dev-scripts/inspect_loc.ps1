$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$loc = $asm.GetType("Localization")
$methods = $loc.GetMethods([System.Reflection.BindingFlags]"Public,NonPublic,Instance,Static")
foreach ($m in $methods) {
    if ($m.Name -match "Load|Init|Setup") {
        Write-Output "Method: $($m.Name)"
        $body = $m.GetMethodBody()
        if ($body) {
            $il = $body.GetILAsByteArray()
            # print referenced strings
            $i = 0
            while ($i -lt $il.Length) {
                if ($il[$i] -eq 0x72) { # ldstr
                    $token = [System.BitConverter]::ToInt32($il, $i + 1)
                    try {
                        $s = $m.Module.ResolveString($token)
                        Write-Output "  str: $s"
                    } catch {}
                    $i += 5
                } else {
                    $i += 1
                }
            }
        }
    }
}

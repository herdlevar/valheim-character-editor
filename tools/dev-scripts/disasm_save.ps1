$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$t = $asm.GetType("ItemDrop+ItemData")
$saveMethod = $t.GetMethod("Save", [System.Reflection.BindingFlags]"Public,NonPublic,Instance")
$body = $saveMethod.GetMethodBody()
$il = $body.GetILAsByteArray()
$module = $saveMethod.Module

# Let's inspect local variables
Write-Output "Local variables:"
$body.LocalVariables | ForEach-Object { "$($_.LocalIndex): $($_.LocalType.FullName)" }

# Let's see what tokens are referenced in IL
Write-Output "`nReferenced member tokens in Save:"
$i = 0
while ($i -lt $il.Length) {
    $op = $il[$i]
    $i++
    # check for call/callvirt (0x28, 0x6f), ldfld/stfld (0x7b, 0x7d), ldflda (0x7c)
    if ($op -eq 0x28 -or $op -eq 0x6f -or $op -eq 0x7b -or $op -eq 0x7d -or $op -eq 0x7c) {
        $token = [System.BitConverter]::ToInt32($il, $i)
        $i += 4
        try {
            $member = $module.ResolveMember($token)
            Write-Output "0x$([Convert]::ToString($op, 16)) -> $($member.DeclaringType.Name)::$($member.Name)"
        } catch {
            Write-Output "0x$([Convert]::ToString($op, 16)) -> Token 0x$([Convert]::ToString($token, 16))"
        }
    }
}

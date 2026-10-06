$dir = 'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed'
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.dll") | Out-Null
[System.Reflection.Assembly]::LoadFrom("$dir\UnityEngine.CoreModule.dll") | Out-Null
$asm = [System.Reflection.Assembly]::LoadFrom("$dir\assembly_valheim.dll")
$t = $asm.GetType("ItemDrop+ItemData")
$saveMethod = $t.GetMethod("Save", [System.Reflection.BindingFlags]"Public,NonPublic,Instance")
$body = $saveMethod.GetMethodBody()
$il = $body.GetILAsByteArray()
$module = $saveMethod.Module

$opcodes = @{}
[System.Reflection.Emit.OpCodes].GetFields() | ForEach-Object {
    $op = $_.GetValue($null)
    $opcodes[$op.Value] = $op
}

$i = 0
while ($i -lt $il.Length) {
    $offset = $i
    $b = $il[$i]
    $i++
    $op = $null
    if ($b -eq 0xfe) {
        $b2 = $il[$i]
        $i++
        $val = [int16](0xfe00 + $b2)
        $op = $opcodes[$val]
    } else {
        $op = $opcodes[[int16]$b]
    }
    
    if (-not $op) {
        Write-Output "$offset : unknown opcode 0x$([Convert]::ToString($b, 16))"
        continue
    }
    
    $arg = ""
    $ot = $op.OperandType
    if ($ot -eq [System.Reflection.Emit.OperandType]::InlineNone) {
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::ShortInlineI) {
        $arg = [sbyte]$il[$i]; $i += 1
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::InlineI) {
        $arg = [System.BitConverter]::ToInt32($il, $i); $i += 4
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::InlineI8) {
        $arg = [System.BitConverter]::ToInt64($il, $i); $i += 8
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::ShortInlineR) {
        $arg = [System.BitConverter]::ToSingle($il, $i); $i += 4
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::InlineR) {
        $arg = [System.BitConverter]::ToDouble($il, $i); $i += 8
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::ShortInlineVar) {
        $arg = "loc_" + $il[$i]; $i += 1
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::InlineVar) {
        $arg = "loc_" + [System.BitConverter]::ToInt16($il, $i); $i += 2
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::ShortInlineBrTarget) {
        $rel = [sbyte]$il[$i]; $i += 1
        $arg = "IL_" + ($i + $rel).ToString("X4")
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::InlineBrTarget) {
        $rel = [System.BitConverter]::ToInt32($il, $i); $i += 4
        $arg = "IL_" + ($i + $rel).ToString("X4")
    } elseif ($ot -in @([System.Reflection.Emit.OperandType]::InlineMethod, [System.Reflection.Emit.OperandType]::InlineField, [System.Reflection.Emit.OperandType]::InlineType, [System.Reflection.Emit.OperandType]::InlineTok)) {
        $token = [System.BitConverter]::ToInt32($il, $i); $i += 4
        try {
            $member = $module.ResolveMember($token)
            $arg = "$($member.DeclaringType.Name)::$($member.Name)"
        } catch {
            $arg = "token:0x$([Convert]::ToString($token, 16))"
        }
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::InlineString) {
        $token = [System.BitConverter]::ToInt32($il, $i); $i += 4
        try {
            $arg = '"' + $module.ResolveString($token) + '"'
        } catch {
            $arg = "str:0x$([Convert]::ToString($token, 16))"
        }
    } elseif ($ot -eq [System.Reflection.Emit.OperandType]::InlineSwitch) {
        $count = [System.BitConverter]::ToInt32($il, $i); $i += 4
        $i += 4 * $count
        $arg = "switch($count)"
    }
    Write-Output ("IL_{0:X4}: {1,-12} {2}" -f $offset, $op.Name, $arg)
}

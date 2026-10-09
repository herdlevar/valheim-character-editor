$sh = New-Object -ComObject WScript.Shell
$target = $sh.CreateShortcut("$env:USERPROFILE\Desktop\Valheim Character Editor.lnk")
[PSCustomObject]@{
    TargetPath = $target.TargetPath
    Arguments = $target.Arguments
    WorkingDirectory = $target.WorkingDirectory
    IconLocation = $target.IconLocation
} | Format-List

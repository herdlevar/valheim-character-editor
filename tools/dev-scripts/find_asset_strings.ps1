$path = "D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\resources.assets"
$bytes = [System.IO.File]::ReadAllBytes($path)

# Extract ASCII strings of length 4 to 40 that match patterns
$pattern = "(stair|ladder|door|gate|darkwood|woodiron|iron_wall|iron_floor|window|cloth_hanging)"
$strBuilder = New-Object System.Text.StringBuilder
$found = @{}

for ($i = 0; $i -lt $bytes.Length; $i++) {
    $b = $bytes[$i]
    if ($b -ge 32 -and $b -le 126) {
        [void]$strBuilder.Append([char]$b)
    } else {
        if ($strBuilder.Length -ge 4 -and $strBuilder.Length -le 45) {
            $s = $strBuilder.ToString()
            if ($s -match $pattern -and $s -match "^[a-zA-Z0-9_]+$") {
                $found[$s] = $true
            }
        }
        $strBuilder.Clear()
    }
}

Write-Host "Found $($found.Count) matching strings in resources.assets:"
$found.Keys | Sort-Object | ForEach-Object { Write-Host $_ }

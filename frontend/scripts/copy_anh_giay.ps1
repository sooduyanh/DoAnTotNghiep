# Copy shoe images from workspace `.../ảnh/anh_giay` to frontend public folder so Vite can serve them.
# Run this script in PowerShell (may require appropriate permissions).

$source = "C:\Users\ler64\OneDrive\Máy tính\ĐATN\ảnh\anh_giay"
$dest = "C:\Users\ler64\OneDrive\Máy tính\ĐATN\OutPut_V3\frontend\public\anh_giay"

if (-not (Test-Path $source)) {
    Write-Error "Source folder not found: $source"
    exit 1
}

if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

# Copy all files from source to dest
Get-ChildItem -Path $source -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $dest -Force
}

Write-Host "Copied images from $source to $dest" -ForegroundColor Green

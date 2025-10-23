# Windows Defender Exclusion Setup Script
# Must be run as Administrator

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Windows Defender Exclusion Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check admin privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Administrator privileges required!" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Admin privileges confirmed" -ForegroundColor Green
Write-Host ""

# Project paths
$projectPath = "D:\pythonProject\koco_nextjs_final"
$nextPath = "$projectPath\.next"
$nodeModulesPath = "$projectPath\node_modules"

Write-Host "Adding folders to Windows Defender exclusion list:" -ForegroundColor Yellow
Write-Host "  - $nextPath" -ForegroundColor White
Write-Host "  - $nodeModulesPath" -ForegroundColor White
Write-Host ""

try {
    # Add .next folder exclusion
    Write-Host "Adding .next folder exclusion..." -ForegroundColor Cyan
    Add-MpPreference -ExclusionPath $nextPath
    Write-Host "Done: .next folder" -ForegroundColor Green

    # Add node_modules folder exclusion
    Write-Host "Adding node_modules folder exclusion..." -ForegroundColor Cyan
    Add-MpPreference -ExclusionPath $nodeModulesPath
    Write-Host "Done: node_modules folder" -ForegroundColor Green

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "All exclusions added successfully!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next.js build issues should be greatly reduced." -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host ""
}

# Show current exclusions
Write-Host "Current Windows Defender exclusions:" -ForegroundColor Cyan
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath | Where-Object { $_ -like "*koco*" }
Write-Host ""

Read-Host "Press Enter to exit"

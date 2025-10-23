# Windows Defender 제외 설정 스크립트
# 관리자 권한으로 실행해야 합니다
# 우클릭 -> "PowerShell에서 실행" -> "예" 클릭

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Windows Defender 제외 설정" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 관리자 권한 확인
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "오류: 관리자 권한이 필요합니다!" -ForegroundColor Red
    Write-Host ""
    Write-Host "해결 방법:" -ForegroundColor Yellow
    Write-Host "1. PowerShell을 관리자 권한으로 실행" -ForegroundColor Yellow
    Write-Host "2. 다음 명령어 실행:" -ForegroundColor Yellow
    Write-Host "   cd D:\pythonProject\koco_nextjs_final" -ForegroundColor Green
    Write-Host "   .\setup-defender-exclusions.ps1" -ForegroundColor Green
    Write-Host ""
    Read-Host "아무 키나 누르면 종료됩니다"
    exit 1
}

Write-Host "관리자 권한 확인됨" -ForegroundColor Green
Write-Host ""

# 프로젝트 경로
$projectPath = "D:\pythonProject\koco_nextjs_final"
$nextPath = "$projectPath\.next"
$nodeModulesPath = "$projectPath\node_modules"

Write-Host "다음 폴더들을 Windows Defender 제외 목록에 추가합니다:" -ForegroundColor Yellow
Write-Host "  - $nextPath" -ForegroundColor White
Write-Host "  - $nodeModulesPath" -ForegroundColor White
Write-Host ""

try {
    # .next 폴더 제외
    Write-Host ".next 폴더 제외 추가 중..." -ForegroundColor Cyan
    Add-MpPreference -ExclusionPath $nextPath
    Write-Host ".next 폴더 제외 완료" -ForegroundColor Green

    # node_modules 폴더 제외
    Write-Host "node_modules 폴더 제외 추가 중..." -ForegroundColor Cyan
    Add-MpPreference -ExclusionPath $nodeModulesPath
    Write-Host "node_modules 폴더 제외 완료" -ForegroundColor Green

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "모든 제외 설정이 완료되었습니다!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "이제 Next.js 빌드 문제가 크게 줄어들 것입니다." -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "오류 발생: $_" -ForegroundColor Red
    Write-Host ""
}

# 현재 제외 목록 확인
Write-Host "현재 Windows Defender 제외 목록:" -ForegroundColor Cyan
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath | Where-Object { $_ -like "*koco*" }
Write-Host ""

Read-Host "아무 키나 누르면 종료됩니다"

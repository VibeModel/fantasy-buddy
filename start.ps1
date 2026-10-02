# ============================================
# 奇幻小伙伴 (Fantasy Buddy) 一键启动脚本
# 由 start.bat 调用，也可手动运行：
#   powershell -ExecutionPolicy Bypass -File start.ps1
# ============================================

$Root = $PSScriptRoot
$serverDir = Join-Path $Root 'fantasy-buddy-server'
$clientDir = Join-Path $Root 'fantasy-buddy-client'

Write-Host ''
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host '   奇幻小伙伴 (Fantasy Buddy) 一键启动' -ForegroundColor Cyan
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host ''

# 1. 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host '[错误] 未检测到 Node.js，请先安装：https://nodejs.org' -ForegroundColor Red
    Read-Host '按回车键退出'
    exit 1
}

# 2. 首次运行：安装依赖
if (-not (Test-Path (Join-Path $serverDir 'node_modules'))) {
    Write-Host '[1/3] 首次运行，安装后端依赖（约 1 分钟）...' -ForegroundColor Yellow
    Push-Location $serverDir
    npm install
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[错误] 后端依赖安装失败，请检查网络后重试' -ForegroundColor Red
        Read-Host '按回车键退出'
        exit 1
    }
    Write-Host ''
}

if (-not (Test-Path (Join-Path $clientDir 'node_modules'))) {
    Write-Host '[2/3] 首次运行，安装前端依赖（约 1 分钟）...' -ForegroundColor Yellow
    Push-Location $clientDir
    npm install
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[错误] 前端依赖安装失败，请检查网络后重试' -ForegroundColor Red
        Read-Host '按回车键退出'
        exit 1
    }
    Write-Host ''
}

# 3. 启动服务（独立窗口，日志可见，关窗即停）
Write-Host '[3/3] 启动服务...' -ForegroundColor Yellow

Start-Process cmd -ArgumentList "/k title 奇幻小伙伴-后端:3000 && cd /d `"$serverDir`" && npm start"

Start-Sleep -Seconds 3

Start-Process cmd -ArgumentList "/k title 奇幻小伙伴-前端:5173 && cd /d `"$clientDir`" && npm run dev"

Start-Sleep -Seconds 4

Start-Process 'http://localhost:5173'

Write-Host ''
Write-Host '启动完成！' -ForegroundColor Green
Write-Host '  后端 API: http://localhost:3000（健康检查 /health）'
Write-Host '  前端页面: http://localhost:5173'
Write-Host '    家长端: http://localhost:5173/parent'
Write-Host '    儿童端: http://localhost:5173/child/login'
Write-Host ''
Write-Host '停止服务：关闭对应的两个命令行窗口即可。'
Write-Host ''
Read-Host '按回车键关闭本窗口'

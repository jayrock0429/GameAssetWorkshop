@echo off
setlocal enabledelayedexpansion

title Asset Hub Orchestrator Pro

echo ===========================================
echo    Asset Hub Orchestrator Pro 啟動中...
echo ===========================================

:: 檢查環境
where python >nul 2>1
if %errorlevel% neq 0 (
    echo [ERROR] 找不到 Python 環境。
    pause
    exit /b
)

:: 直接啟動桌面應用程式 (會自動處理後端與視窗)
echo 正在載入原生應用視窗...
python "%~dp0scripts\asset_hub_server.py"

echo.
echo 服務已關閉。
exit

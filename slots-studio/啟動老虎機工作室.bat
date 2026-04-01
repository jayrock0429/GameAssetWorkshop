@echo off
:: 解決亂碼問題
chcp 65001 > nul
title 老虎機工作室啟動器
cd /d D:\AG\GameAssetWorkshop\slots-studio
echo ========================================
echo  老虎機工作室：正在發動引擎...
echo  稍後將自動為您開啟瀏覽器入口
echo ========================================

:: 先在背景等 3 秒後自動開啟瀏覽器（避免伺服器還沒跑好就開了）
start "" cmd /c "timeout /t 3 /nobreak > nul & start http://localhost:3030"

:: 正式啟動伺服器
call pnpm next dev -p 3030

if %errorlevel% neq 0 (
    echo.
    echo [警告] 啟動似乎遇到了點困難...
    pause
)

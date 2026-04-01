@echo off
chcp 65001 > nul
title Slot 美術生成系統 - 啟動器
echo ======================================================
echo    AI Slot 美術自動化生成系統 - 正在啟動...
echo ======================================================
echo.

cd /d "%~dp0"

:: 檢查是否有 .env 檔案
if not exist ".env" (
    echo [警告] 找不到 .env 檔案！
    echo 請先將 .env.example 重新命名為 .env 並填入專案 ID。
    pause
    exit
)

:: 啟動伺服器 (在背景執行)
echo [1/2] 正在啟動後端服務器...
start /b node server.js

:: 等待 2 秒讓伺服器準備好
timeout /t 3 /nobreak > nul

:: 自動開啟瀏覽器
echo [2/2] 正在開啟視覺化介面...
start http://localhost:3000

echo.
echo ======================================================
echo    系統已成功啟動！
echo    請直接在瀏覽器中使用。
echo    (如果要關閉系統，請直接關閉此黑色視窗)
echo ======================================================
echo.

:: 保持視窗開啟以查看 log
pause

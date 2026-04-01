@echo off
chcp 65001 >nul
title AI Game Asset Workshop (React + Python)
echo ===================================================
echo     啟動 AI 自動化美術資源系統 
echo ===================================================

echo [1/2] 啟動 Python 後端伺服器 (API)...
start /B py scripts/web_backend.py

echo [2/2] 啟動 React 前端面板 (Vite)...
cd frontend
start /B npm run dev

echo.
echo [System] 服務啟動中，請稍候...
timeout /t 4 >nul
start http://localhost:5173

echo.
echo ===================================================
echo [!] 系統運行中。請保持此黑視窗開啟，關閉即停止服務。
echo ===================================================
pause

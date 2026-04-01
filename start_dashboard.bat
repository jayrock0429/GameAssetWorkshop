@echo off
echo Starting Slot AI Workshop...
echo Refreshing PSD Analysis...
:: py deep_psd_inspect.py (Disabled by default to save time)
start /B py scripts/web_backend.py
timeout /t 3
start http://localhost:5081
echo Backend running. Close this window to stop.
pause

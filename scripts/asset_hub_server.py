import os
import sys
import json
import threading
import subprocess
import collections
import time
import webview
from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path

# 基本路徑設定
script_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(script_dir)
config_path = Path(base_dir) / "asset_hub_config.json"

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
CORS(app)

# --- Asset Hub 狀態與日誌 ---
ASSET_HUB_PROCESS = None
ASSET_HUB_LOGS = collections.deque(maxlen=200)

def manage_asset_hub_io(proc):
    global ASSET_HUB_LOGS
    for line in iter(proc.stdout.readline, ""):
        if line:
            clean_line = line.strip()
            ASSET_HUB_LOGS.append(clean_line)
    proc.stdout.close()

# --- API 路由 ---
@app.route('/api/status', methods=['GET'])
def get_status():
    global ASSET_HUB_PROCESS
    is_running = ASSET_HUB_PROCESS is not None and ASSET_HUB_PROCESS.poll() is None
    return jsonify({
        "is_running": is_running,
        "pid": ASSET_HUB_PROCESS.pid if (ASSET_HUB_PROCESS and is_running) else None
    })

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'GET':
        if config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    return jsonify(json.load(f))
            except Exception:
                pass
        # 回傳預設結構
        return jsonify({
            "watch_dirs": [],
            "target_dir": "",
            "conflict_strategy": "smart_rename",
            "supported_extensions": [".png", ".jpg"]
        })
    else:
        new_config = request.json
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(new_config, f, indent=2)
        return jsonify({"status": "success"})

@app.route('/api/start', methods=['POST'])
def start_hub():
    global ASSET_HUB_PROCESS
    if ASSET_HUB_PROCESS and ASSET_HUB_PROCESS.poll() is None:
        return jsonify({"status": "already_running"})
    
    script_path = os.path.join(script_dir, 'asset_hub.py')
    ASSET_HUB_PROCESS = subprocess.Popen(
        [sys.executable, script_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=base_dir
    )
    
    threading.Thread(target=manage_asset_hub_io, args=(ASSET_HUB_PROCESS,), daemon=True).start()
    return jsonify({"status": "started"})

@app.route('/api/stop', methods=['POST'])
def stop_hub():
    global ASSET_HUB_PROCESS
    if ASSET_HUB_PROCESS:
        ASSET_HUB_PROCESS.terminate()
        ASSET_HUB_PROCESS = None
        return jsonify({"status": "stopped"})
    return jsonify({"status": "not_running"})

@app.route('/api/logs', methods=['GET'])
def get_logs():
    return jsonify({"logs": list(ASSET_HUB_LOGS)})

# --- 啟動函式 ---
def run_flask():
    app.run(port=5082, debug=False, use_reloader=False)

def main():
    # 1. 在背景執行 Flask
    t = threading.Thread(target=run_flask, daemon=True)
    t.start()
    
    # 2. 等待 Flask 啟動
    time.sleep(1)
    
    # 3. 建立並啟動 WebView 視窗
    ui_path = os.path.join(script_dir, 'asset_hub_ui.html')
    
    # 解析 UI 檔案並暫時替換 API 地址為本地
    with open(ui_path, 'r', encoding='utf-8') as f:
        html_content = f.read().replace(":5081/api/asset-hub", ":5082/api")
        # 額外確保通用 API 指向 5082
        html_content = html_content.replace("http://localhost:5081/api", "http://localhost:5082/api")

    window = webview.create_window(
        'Asset Hub Orchestrator Pro', 
        html=html_content,
        width=1100, 
        height=800,
        background_color='#050614',
        min_size=(900, 600)
    )
    
    print("Asset Hub Desktop App is running...")
    webview.start()
    
    # 4. 當視窗關閉時，檢查並關閉監控進程
    global ASSET_HUB_PROCESS
    if ASSET_HUB_PROCESS:
        print("清理背景監控進程...")
        ASSET_HUB_PROCESS.terminate()

if __name__ == '__main__':
    main()

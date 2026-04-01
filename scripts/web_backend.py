import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from dotenv import load_dotenv

# Load environment at startup (Absolute Path)
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(os.path.dirname(script_dir), ".env")
from dotenv import load_dotenv

# Load unified environment configuration
import env_config

# Make sure we can import from scripts
sys.path.append(env_config.BASE_DIR)
sys.path.append(os.path.join(env_config.BASE_DIR, "scripts"))
from slot_ai_creator_clean import SlotAICreator
from agent_queue_manager import queue_manager
import collections
import threading

# --- Log Capture Setup ---
class LoggerCapture:
    def __init__(self, max_lines=200):
        self.logs = collections.deque(maxlen=max_lines)
        self.original_stdout = sys.stdout
        self._lock = threading.Lock()

    def write(self, message):
        self.original_stdout.write(message)
        if message.strip():
            with self._lock:
                # Add a safe string cast
                self.logs.append(str(message).strip())

    def flush(self):
        self.original_stdout.flush()

    def get_logs(self):
        with self._lock:
            return list(self.logs)

    def clear(self):
        with self._lock:
            self.logs.clear()

global_logger = LoggerCapture()
sys.stdout = global_logger
# -------------------------

app = Flask(__name__, static_folder='../output')
app.config['JSON_AS_ASCII'] = False # [V5] 支援中文 JSON 輸出
CORS(app)

CREATOR = SlotAICreator()
print("DEBUG: Web Backend V2 initialized.")

@app.route('/')
def dashboard():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dashboard_path = os.path.join(script_dir, 'dashboard.html')
    if os.path.exists(dashboard_path):
        with open(dashboard_path, 'r', encoding='utf-8') as f:
            return f.read()
    else:
        return f"Error: dashboard.html not found at {dashboard_path}", 404

@app.route('/api/status', methods=['GET'])
def get_status():
    # 搜尋根目錄與 output 目錄下的 PSD, PNG, JPG 及 XLSX
    root_files = [f for f in os.listdir(env_config.BASE_DIR) if f.lower().endswith(('.psd', '.png', '.jpg', '.xlsx'))]
    output_files = []
    output_root = env_config.OUTPUT_DIR
    if os.path.exists(output_root):
        for root, _, files in os.walk(output_root):
            for f in files:
                if f.lower().endswith(('.psd', '.xlsx')):
                    rel_path = os.path.relpath(os.path.join(root, f), env_config.BASE_DIR)
                    output_files.append(rel_path.replace("\\", "/"))
    
    all_files = root_files + output_files
    
    # Check AI Mode
    mode = "Mock Mode [OFF]"
    gemini = os.environ.get("GEMINI_API_KEY")
    openai = os.environ.get("OPENAI_API_KEY")
    
    if gemini:
        mode = "Gemini Pro [ON]"
    elif openai:
        mode = "DALL-E 3 [ON]"
        
    return jsonify({
        "workspace": CREATOR.base_dir,
        "files": all_files,
        "ai_mode": mode
    })

@app.route('/api/generate-prompt', methods=['POST'])
def generate_prompt():
    data = request.json
    theme = data.get('theme')
    prompt = CREATOR._reason_prompt({"theme": theme, "component": "Concept"})
    return jsonify({"prompt": prompt})

@app.route('/api/analyze-psd', methods=['POST'])
def analyze_psd():
    data = request.json
    psd_name = data.get('psd_name')
    
    # [V4.8] 聰明判斷路徑
    if psd_name.startswith("output"):
        psd_path = os.path.join(CREATOR.base_dir, psd_name)
    else:
        psd_path = os.path.join(CREATOR.base_dir, psd_name)
        
    layout = CREATOR.analyze_psd(psd_path)
    
    # [PSD Constraint] 回傳 layout_mode 讓前端自動切換下拉選單
    auto_layout_mode = "Cabinet"  # 預設橫版
    if CREATOR.layout_constraints:
        auto_layout_mode = CREATOR.layout_constraints.layout_mode
    elif layout:
        # 依畫布比例判斷
        canvas_w = layout.get("width", 1920)
        canvas_h = layout.get("height", 1080)
        auto_layout_mode = "H5_Mobile" if canvas_h > canvas_w else "Cabinet"

    response_data = layout or {}
    response_data["auto_layout_mode"] = auto_layout_mode
    response_data["canvas_w"] = layout.get("width") if layout else None
    response_data["canvas_h"] = layout.get("height") if layout else None
    
    print(f"[analyze-psd] PSD={psd_name}, auto_layout_mode={auto_layout_mode}")
    return jsonify(response_data)

@app.route('/output/<path:filename>')
def serve_output(filename):
    """Serve generated files from the unified output directory"""
    return send_from_directory(env_config.OUTPUT_DIR, filename)

@app.route('/api/styles', methods=['GET'])
def get_styles():
    """Return available style profiles from styles.json"""
    # Live reload styles
    CREATOR.load_styles()
    if hasattr(CREATOR, 'styles_config'):
        return jsonify(CREATOR.styles_config)
    else:
        return jsonify({})

@app.route('/api/import-doc', methods=['POST'])
def import_doc():
    """解析 Excel 企劃文件並傳回資產清單 (支援本地上傳)"""
    try:
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"status": "error", "message": "No selected file"}), 400
            
            # Save uploaded file temporarily
            temp_path = os.path.join(env_config.BASE_DIR, "temp_uploaded.xlsx")
            file.save(temp_path)
            manifest = CREATOR.import_requirements(temp_path)
            return jsonify({"status": "success", "manifest": manifest})
            
        else:
            data = request.json
            path = data.get('path')
            if not path:
                return jsonify({"status": "error", "message": "No path or file provided"}), 400
                
            manifest = CREATOR.import_requirements(path)
            return jsonify({"status": "success", "manifest": manifest})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/fully-autonomous', methods=['POST'])
def fully_autonomous():
    """V27.0: 非同步佇列版本的全自主產線 API"""
    try:
        data = request.json
        req = data.get('requirement', 'Mysterious Slot')
        psd = data.get('psd_name')
        if psd:
            data['psd_path'] = os.path.join(env_config.BASE_DIR, psd)

        # 把工作任務打包推入 Agent Queue Manager
        def _runner(job_data, t_id, callback):
            print(f"[{t_id}] Worker started job: {job_data.get('requirement')}")
            
            # 在背景中將 callback 傳入核心引擎
            result = CREATOR.run_fully_autonomous(
                requirement=job_data.get('requirement'),
                psd_path=job_data.get('psd_path'),
                style=job_data.get('style', '3D_Premium'),
                mock=job_data.get('mock', False),
                symbol_list=job_data.get('symbols'),
                layout_mode=job_data.get('layout_mode', 'Cabinet'),
                spacing_x=job_data.get('spacing_x', 10),
                spacing_y=job_data.get('spacing_y', 10),
                custom_layout=job_data.get('custom_layout'),
                symbol_configs=job_data.get('symbol_configs'),
                task_id=t_id,
                update_callback=callback
            )

            # 轉換組件路徑為 URL
            import urllib.parse
            session_id = os.path.basename(CREATOR.output_dir)
            components_url = {}
            if "components" in result:
                for k, v in result["components"].items():
                    if isinstance(v, dict):
                        components_url[k] = {sk: f"/output/{session_id}/{urllib.parse.quote(os.path.basename(sv))}" if sv else None for sk, sv in v.items()}
                    elif isinstance(v, list):
                        components_url[k] = [f"/output/{session_id}/{urllib.parse.quote(os.path.basename(item))}" if item else None for item in v]
                    elif v:
                        components_url[k] = f"/output/{session_id}/{urllib.parse.quote(os.path.basename(v))}"
                
                result["components_url"] = components_url

            if result.get('image'): 
                result["image_url"] = f"/output/{session_id}/{urllib.parse.quote(os.path.basename(result['image']))}"
            if result.get('jsx'):
                result["jsx_url"] = f"/output/{session_id}/{urllib.parse.quote(os.path.basename(result['jsx']))}"
            
            return result

        task_id = queue_manager.submit_task(data, _runner)
        return jsonify({
            "status": "queued",
            "task_id": task_id,
            "message": "Task has been added to the background queue."
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/task/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """查詢任務進定最新狀態"""
    task_info = queue_manager.get_task_status(task_id)
    if not task_info:
        return jsonify({"status": "error", "message": "Task not found"}), 404
    return jsonify(task_info)

@app.route('/api/stop', methods=['POST'])
def stop_processing():
    """V20.7: 停止 AI 生成引擎"""
    print("DEBUG: Stop request received from UI.")
    CREATOR.request_stop()
    return jsonify({"status": "stopping"})

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """[V20.10 / Console] 實時取得終端機擷取的日誌字串清單"""
    return jsonify({"logs": global_logger.get_logs()})

if __name__ == '__main__':
    print("Starting Web Backend V2 on Port 5081...")
    # Disable debug to prevent reloader from restarting on every file change
    app.run(debug=False, port=5081)

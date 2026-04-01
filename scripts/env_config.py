import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# 取得目前執行的腳本目錄 (GameAssetWorkshop/scripts)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# 根目錄 (GameAssetWorkshop)
BASE_DIR = os.path.dirname(SCRIPT_DIR)

# 系統全域路徑配置
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
CONFIG_DIR = os.path.join(BASE_DIR, "config")
RESOURCES_DIR = os.path.join(BASE_DIR, "resources")

# 確保輸出目錄存在
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 載入 .env 環境變數
ENV_PATH = os.path.join(BASE_DIR, ".env")
result = load_dotenv(ENV_PATH, override=True)
print(f"DEBUG: load_dotenv from {ENV_PATH} -> {result}")
print(f"DEBUG: GEMINI_API_KEY in environment: {bool(os.environ.get('GEMINI_API_KEY'))}")

def get_base_dir():
    return BASE_DIR

def get_output_dir():
    return OUTPUT_DIR

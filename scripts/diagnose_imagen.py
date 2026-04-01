"""
Imagen API 診斷工具
執行：py scripts/diagnose_imagen.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"), override=True)

key = os.environ.get("GEMINI_API_KEY")
log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "imagen_diagnosis.log")

def log(msg):
    print(msg)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

open(log_path, "w", encoding="utf-8").close()
log("=" * 60)
log("Imagen API 診斷工具")
log("=" * 60)

if not key:
    log("❌ GEMINI_API_KEY 未設定！請檢查 .env 檔案")
    sys.exit(1)

log(f"✅ API Key 已載入: {key[:8]}...")

try:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=key)
    log("✅ google-genai SDK 已安裝")
except ImportError as e:
    log(f"❌ google-genai SDK 未安裝: {e}")
    log("   請執行: pip install google-genai")
    sys.exit(1)

# 測試 Imagen 4
models_to_try = [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
    "imagen-3.0-generate-001",
]

for model in models_to_try:
    log(f"\n--- 測試模型: {model} ---")
    try:
        response = client.models.generate_images(
            model=model,
            prompt="A simple red circle on white background, minimal.",
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1"
            )
        )
        if response.generated_images:
            out_path = log_path.replace("imagen_diagnosis.log", f"test_{model.replace('.', '_')}.png")
            response.generated_images[0].image.save(out_path)
            log(f"✅ 成功！圖片已儲存: {out_path}")
            break
        else:
            log(f"⚠️  API 回應為空，沒有生成圖片")
    except Exception as e:
        log(f"❌ 失敗: {type(e).__name__}: {e}")

log("\n" + "=" * 60)
log(f"診斷完成，詳細報告: {log_path}")
log("=" * 60)

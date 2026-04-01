import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)
gemini_key = os.environ.get("GEMINI_API_KEY")

try:
    from google import genai
    client = genai.Client(api_key=gemini_key)
    
    print("Listing available models that support image generation...")
    models = client.models.list()
    for m in models:
        # 檢查是否支援 image generation 或屬於 imagen/gemini-3 家族
        if "generate_images" in m.supported_actions or "image" in m.name:
            print(f"- {m.name} (Actions: {m.supported_actions})")
            
except Exception as e:
    print(f"❌ Error: {e}")

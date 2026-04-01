import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)
gemini_key = os.environ.get("GEMINI_API_KEY")

try:
    from google import genai
    client = genai.Client(api_key=gemini_key)
    
    print("Testing gemini-3-pro-image-preview with generate_content...")
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents="Generate a simple icon of a star.",
    )
    
    # 嘗試提取圖片 bytes
    part = response.candidates[0].content.parts[0]
    if hasattr(part, 'inline_data') and part.inline_data:
        image_bytes = part.inline_data.data
        with open("test_g3.png", "wb") as f:
            f.write(image_bytes)
        print("✅ Successfully extracted and saved test_g3.png")
    else:
        print("❌ Could not find inline_data in response.")
        print(response.candidates[0].content)
except Exception as e:
    print(f"❌ Error: {e}")

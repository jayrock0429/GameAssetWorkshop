import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)
gemini_key = os.environ.get("GEMINI_API_KEY")

try:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=gemini_key)
    
    print("Testing gemini-3-pro-image-preview...")
    # NOTE: Gemini 3 Pro Image uses generate_content NOT generate_images
    response = client.models.generate_images(
        model="gemini-3-pro-image-preview",
        prompt="A simple test icon",
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="1:1"
        )
    )
    print("✅ Success! generate_images worked.")
except Exception as e:
    print(f"❌ Error: {e}")

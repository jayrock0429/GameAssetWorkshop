import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)
gemini_key = os.environ.get("GEMINI_API_KEY")

try:
    from google import genai
    client = genai.Client(api_key=gemini_key)
    
    test_models = [
        "gemini-2.5-flash-image",
        "gemini-2.0-flash-exp-image-generation",
        "gemini-3-pro-image-preview"
    ]
    
    for model_name in test_models:
        print(f"Testing {model_name}...")
        try:
            response = client.models.generate_content(
                model=model_name,
                contents="Generate a simple icon of a golden coin.",
            )
            
            image_bytes = None
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    image_bytes = part.inline_data.data
                    break
            
            if image_bytes:
                print(f"✅ {model_name} successfully generated an image.")
                with open(f"test_{model_name.replace('/', '_')}.png", "wb") as f:
                    f.write(image_bytes)
            else:
                print(f"❌ {model_name} did not return inline_data.")
                # Print finish reason if it failed
                print(f"   Finish Reason: {response.candidates[0].finish_reason}")
        except Exception as e:
            print(f"❌ {model_name} Error: {e}")
            
except Exception as e:
    print(f"❌ Error: {e}")

import os
import sys
import time

# Add scripts directory to path
script_dir = os.path.join(os.getcwd(), 'scripts')
sys.path.append(script_dir)

from api_client import APIClient
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path, override=True)

def check_status():
    print("=== API Quota & Health Check ===")
    client = APIClient()
    
    # We'll try to generate a tiny mock request to see the error response
    test_prompt = "A simple white dot"
    test_path = "quota_test.png"
    
    print(f"Testing Model Sequence from api_client.py...")
    
    # Normally we would call client.generate_image, but let's look inside for detailed logs
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        print("[ERROR] No GEMINI_API_KEY found in environment.")
        return

    try:
        from google import genai
        from google.genai import types
        genai_client = genai.Client(api_key=gemini_key)
        
        imagen_models = [
            'gemini-2.5-flash-image',
            'gemini-3-pro-image-preview',
            'gemini-2.0-flash-exp-image-generation',
            'imagen-3.0-generate-001',
            'imagen-4.0-generate-001', 
            'imagen-4.0-fast-generate-001'
        ]
        
        for model_id in imagen_models:
            print(f"\nChecking Model: {model_id}...")
            try:
                # Use a minimal config
                response = genai_client.models.generate_images(
                    model=model_id,
                    prompt=test_prompt,
                    config=types.GenerateImagesConfig(number_of_images=1)
                )
                print(f"[SUCCESS] {model_id} is ACTIVE and has quota.")
            except Exception as e:
                error_msg = str(e)
                upper_msg = error_msg.upper()
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in upper_msg:
                    print(f"[QUOTA EXHAUSTED] {model_id}: Resource exhausted (429).")
                elif "404" in error_msg or "NOT_FOUND" in upper_msg:
                    print(f"[UNAVAILABLE] {model_id}: Model not found or not supported for this API key.")
                else:
                    print(f"[FAILED] {model_id}: {error_msg}")
                    
    except Exception as e:
        print(f"[FATAL] Could not initialize Gemini Client: {e}")

    # Cleanup
    if os.path.exists(test_path):
        os.remove(test_path)

if __name__ == "__main__":
    check_status()

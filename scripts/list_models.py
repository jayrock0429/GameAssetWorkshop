import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

def list_models():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("ERROR: No GEMINI_API_KEY found in .env")
        return

    client = genai.Client(api_key=key)
    print("Listing available models...")
    try:
        for model in client.models.list():
            print(f"Model: {model.name} | Supported: {model.supported_actions}")
    except Exception as e:
        print(f"FAILED to list models: {e}")

if __name__ == "__main__":
    list_models()

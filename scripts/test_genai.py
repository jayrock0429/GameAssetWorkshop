import os
import sys
from dotenv import load_dotenv
from google import genai

script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(os.path.dirname(script_dir), ".env")
load_dotenv(env_path, override=True)

key = os.environ.get("GEMINI_API_KEY")
if not key:
    print("Error: GEMINI_API_KEY not found.")
    sys.exit(1)

print(f"Loaded Key: {key[:8]}...")

try:
    client = genai.Client(api_key=key)
    print("------- Available Models -------")
    # Using the standard SDK way to list models if available, 
    # but the client structure might differ based on version.
    # Trying the most common pattern for google-genai 0.3+
    try:
        # Pager object, iterate
        for m in client.models.list():
            print(f"Name: {m.name}")
            # print(f"  - Supported: {m.supported_generation_methods}") # Remove faulty attribute
    except Exception as e:
        print(f"Error listing models: {e}")

except Exception as e:
    print(f"Client Init Error: {e}")

from google import genai
import os

gemini_key = os.environ.get("GEMINI_API_KEY")
if not gemini_key:
    raise RuntimeError("GEMINI_API_KEY is not set.")

client = genai.Client(api_key=gemini_key)
for m in client.models.list():
    if 'image' in m.name.lower() or 'imagen' in m.name.lower():
        print(f"Model: {m.name}")
        for k, v in dict(m).items():
            print(f"  {k}: {v}")

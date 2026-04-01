import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()
gemini_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=gemini_key)

model_name = "gemini-2.5-flash-image"
print(f"--- Diagnosing {model_name} ---")

try:
    response = client.models.generate_content(
        model=model_name,
        contents="Generate a simple icon of a golden coin.",
    )
    
    print(f"Finish Reason: {response.candidates[0].finish_reason}")
    print(f"Safety Ratings: {response.candidates[0].safety_ratings}")
    
    parts = response.candidates[0].content.parts
    print(f"Number of parts: {len(parts)}")
    
    for i, part in enumerate(parts):
        print(f"Part {i} keys: {dir(part)}")
        if hasattr(part, 'text'):
            print(f"Part {i} text: {part.text}")
        if hasattr(part, 'inline_data'):
            print(f"Part {i} inline_data present: {part.inline_data is not None}")
            if part.inline_data:
                 print(f"Part {i} mime_type: {part.inline_data.mime_type}")
except Exception as e:
    print(f"Error during diagnosis: {e}")

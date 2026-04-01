import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types

script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(os.path.dirname(script_dir), ".env")
load_dotenv(env_path, override=True)

key = os.environ.get("GEMINI_API_KEY")
if not key:
    print("Error: GEMINI_API_KEY not found.")
    sys.exit(1)

print(f"Loaded Key: {key[:8]}...")
client = genai.Client(api_key=key)

try:
    print("Attempting to generate image with 'imagen-4.0-fast-generate-001'...")
    response = client.models.generate_images(
        model='imagen-4.0-fast-generate-001',
        prompt='A futuristic neon city skyline at night, cyberpunk style.',
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="16:9"
        )
    )
    if response.generated_images:
        img_data = response.generated_images[0].image
        print("Success! Image generated.")
        # Save to verify
        # img_data.save("verify_imagen.png") # SDK might return raw bytes or PIL
    else:
        print("Response received providing no images.")
        
except Exception as e:
    print(f"Generation Failed: {e}")
    # Inspect detailed error if available
    if hasattr(e, 'response'):
        print(f"Response details: {e.response}")

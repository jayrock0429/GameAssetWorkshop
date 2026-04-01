import os
import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

def test_imagen():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("ERROR: No GEMINI_API_KEY found in .env")
        return

    client = genai.Client(api_key=key)
    prompt = "A simple gold coin icon for a slot game, 3D render, white background."
    output_path = "test_imagen_output.png"
    
    # Try Imagen 4
    models = ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001']
    
    for model_id in models:
        print(f"Testing model: {model_id}...")
        try:
            response = client.models.generate_images(
                model=model_id,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1"
                )
            )
            response.generated_images[0].image.save(output_path)
            print(f"SUCCESS! Image saved to {output_path}")
            return
        except Exception as e:
            print(f"FAILED for {model_id}: {e}")

if __name__ == "__main__":
    test_imagen()

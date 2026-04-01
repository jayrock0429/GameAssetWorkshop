import os
from google import genai
from google.genai import types

gemini_key = os.environ.get("GEMINI_API_KEY")
if not gemini_key:
    raise RuntimeError("GEMINI_API_KEY is not set.")

client = genai.Client(api_key=gemini_key)
client_alpha = genai.Client(api_key=gemini_key, http_options={'api_version': 'v1alpha'})

models_to_test = [
    'gemini-2.0-flash-exp-image-generation',
    'gemini-3-pro-image-preview',
    'imagen-3.0-generate-002',
    'imagen-3.0-generate-001'
]

for m in models_to_test:
    print(f"\\n--- Testing {m} (v1beta default) ---")
    try:
        response = client.models.generate_images(model=m, prompt="A cute cat", config=types.GenerateImagesConfig(number_of_images=1, aspect_ratio="1:1"))
        print(f"SUCCESS with {m}!")
    except Exception as e:
        print(f"Failed: {e}")

    print(f"\\n--- Testing {m} (v1alpha) ---")
    try:
        response = client_alpha.models.generate_images(model=m, prompt="A cute cat", config=types.GenerateImagesConfig(number_of_images=1, aspect_ratio="1:1"))
        print(f"SUCCESS with {m} (alpha)!")
    except Exception as e:
        print(f"Failed (alpha): {e}")

import os
from google import genai
from google.genai import types

gemini_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=gemini_key)

output_path = "c:/Antigracity/GameAssetWorkshop/real_stress_test_output/hero_symbol.png"

# Highly detailed prompt for a high-end slot game symbol
prompt = "Slot game symbol, a legendary golden championship boxing belt, Knockout Clash theme. 3D render, highly detailed, Unreal Engine 5, raytracing, soft global illumination, glowing neon accents, sharp gold textures, isolated on black background, masterpiece, 4k resolution."

print(f"Calling Imagen 4 to generate Hero Symbol...")
try:
    response = client.models.generate_images(
        model='imagen-4.0-fast-generate-001',
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="1:1"
        )
    )
    if response.generated_images:
        response.generated_images[0].image.save(output_path)
        print(f"✅ Success! Hero Image saved to {output_path}")
    else:
        print("❌ Failed: No images returned.")
except Exception as e:
    print(f"❌ Failed: {e}")

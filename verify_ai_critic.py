import os
import sys
import json
from PIL import Image

# Add script dir to path
sys.path.append(os.path.join(os.path.dirname(__file__), "scripts"))
from ai_critic import AICritic

def create_dummy_image(path, empty=False, blurry=False):
    from PIL import Image, ImageDraw, ImageFilter
    img = Image.new('RGBA', (500, 500), (0, 0, 0, 0) if empty else (255, 255, 255, 255))
    if not empty:
        draw = ImageDraw.Draw(img)
        draw.rectangle([100, 100, 400, 400], fill=(255, 0, 0), outline=(0, 255, 0))
        if blurry:
            img = img.filter(ImageFilter.GaussianBlur(10))
    img.save(path)
    return path

def verify_critic():
    print("Testing AI Critic Module...")
    
    # 1. Test Technical Logic (No API needed)
    critic = AICritic(api_key=None) # No API key for technical test
    
    # Case A: Good Image
    good_img = "test_good.png"
    create_dummy_image(good_img, empty=False, blurry=False)
    res_good = critic.analyze_technical(good_img)
    print(f"Good Image Result: {res_good['passed']} (Expected: True)")
    print(json.dumps(res_good, indent=2))
    
    # Case B: Blurry Image
    blur_img = "test_blur.png"
    create_dummy_image(blur_img, empty=False, blurry=True)
    res_blur = critic.analyze_technical(blur_img)
    print(f"Blurry Image Result: {res_blur['passed']} (Expected: False/Warning)")
    print(json.dumps(res_blur, indent=2))
    
    # Case C: Empty Image
    empty_img = "test_empty.png"
    create_dummy_image(empty_img, empty=True)
    res_empty = critic.analyze_technical(empty_img)
    print(f"Empty Image Result: {res_empty['passed']} (Expected: False)")
    print(json.dumps(res_empty, indent=2))
    
    # Clean up
    for f in [good_img, blur_img, empty_img]:
        if os.path.exists(f):
            try: os.remove(f)
            except: pass

    print("\nVerification Complete.")

if __name__ == "__main__":
    verify_critic()

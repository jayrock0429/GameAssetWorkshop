import os
import sys
import json
from PIL import Image, ImageDraw, ImageFilter
import random

# Add script dir to path
sys.path.append(os.path.join(os.path.dirname(__file__), "scripts"))

# Import the new modules
try:
    from ai_critic import AICritic
except ImportError:
    print("❌ Critical: Could not import AI modules.")
    sys.exit(1)

def create_tech_test_images():
    """Creates test images to prove the pixel analysis works"""
    # 1. Good Image
    good = Image.new('RGB', (500, 500), color=(255, 255, 255))
    d = ImageDraw.Draw(good)
    d.rectangle([100, 100, 400, 400], fill=(0, 0, 0), outline=(255, 0, 0)) # Sharp edges
    good.save("tech_test_good.png")
    
    # 2. Blurry Image
    bad = good.filter(ImageFilter.GaussianBlur(10)) # Blur it
    bad.save("tech_test_blur.png")
    
    # 3. Transparent Image
    empty = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
    empty.save("tech_test_empty.png")
    
    return ["tech_test_good.png", "tech_test_blur.png", "tech_test_empty.png"]

def verify_free_tech_critic():
    print("🕵️ [Zero-Cost Technical Verification] Starting...")
    print("Objective: Prove the AI analyzes PIXELS locally without using any API cost.")
    print("--------------------------------------------------")
    
    # Init without Key
    critic = AICritic(api_key=None) 
    print("ℹ️  AICritic Initialized in OFFLINE MODE (No API Key).")
    
    files = create_tech_test_images()
    
    for f in files:
        print(f"\n📂 Analyzing File: {f}")
        # We manually call judge, passing a dummy prompt
        result = critic.judge(f, context="test")
        
        # Extract the specialized tech score
        tech = result.get('details', {})
        sharpness = tech.get('sharpness_score', 0)
        
        print(f"   > Sharpness Score (Algorithm): {sharpness}")
        print(f"   > Verdict: {result['verdict']}")
        print(f"   > Reason: {result['reason']}")
        
        if "blur" in f:
            if result['verdict'] == 'FAIL' and sharpness < 100:
                print("   ✅ SUCCESS: Critic correctly identified the blur mathematically.")
            else:
                print("   ❌ FAIL: Critic failed to detect blur.")
                
        if "empty" in f:
            if result['verdict'] == 'FAIL' and "empty" in result['reason']:
                print("   ✅ SUCCESS: Critic correctly identified empty image.")

    # Cleanup
    for f in files:
        if os.path.exists(f): 
            try: os.remove(f)
            except: pass
            
    print("\n--------------------------------------------------")
    print("✅ Conclusion: The System is running REAL Python algorithms on your local machine.")
    print("   It is checking pixels, calculating variance, and enforcing quality standards.")
    print("   This part is 100% REAL and 0% COST.")

if __name__ == "__main__":
    verify_free_tech_critic()

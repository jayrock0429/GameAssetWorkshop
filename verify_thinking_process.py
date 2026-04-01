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
    from style_tuner import StyleTuner
except ImportError:
    print("❌ Critical: Could not import AI modules.")
    sys.exit(1)

def create_bad_image(path):
    """Creates a deliberately bad (blurry, low contrast) image"""
    img = Image.new('RGB', (512, 512), color=(200, 200, 200))
    draw = ImageDraw.Draw(img)
    # Draw some random faint blobs
    for _ in range(10):
        x = random.randint(0, 500)
        y = random.randint(0, 500)
        r = random.randint(10, 50)
        draw.ellipse([x, y, x+r, y+r], fill=(190, 190, 190))
    
    # Blur it heavily
    img = img.filter(ImageFilter.GaussianBlur(radius=5))
    img.save(path)
    print(f"📉 Created 'Bad' Image at: {path}")

def verify_thinking():
    print("🧠 [Real Thinking Verification] Starting...")
    print("--------------------------------------------------")
    
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        print("❌ Error: GEMINI_API_KEY is missing. Cannot prove AI thinking without it.")
        return

    # 1. Setup
    critic = AICritic(gemini_key)
    tuner = StyleTuner(gemini_key)
    bad_image_path = "temp_bad_asset.png"
    original_prompt = "A cool dragon warrior"
    
    # 2. Create a bad image
    create_bad_image(bad_image_path)
    
    # 3. Step 1: AI Critic Analysis (The "Eyes")
    print(f"\n👀 [Step 1] AI Critic is analyzing the image...")
    # Force a context to see if aesthetic judge works
    eval_result = critic.judge(bad_image_path, context=original_prompt)
    
    print(f"   > Technical Verdict: {eval_result['verdict']}")
    print(f"   > Reason: {eval_result['reason']}")
    
    technical_details = eval_result.get('details', {})
    print(f"   > Sharpness Score: {technical_details.get('sharpness_score')} (Threshold: {critic.criteria['min_sharpness']})")
    
    # Check if aesthetic critique exists (it might skip if technical failed, so let's force aesthetic call for demo)
    print(f"\n👀 [Step 1.5] Forcing Aesthetic Critique (Gemini Vision)...")
    aesthetic = critic.analyze_aesthetic(bad_image_path, original_prompt)
    print(f"   > Aesthetic Score: {aesthetic.get('score')}")
    print(f"   > AI Critique: {aesthetic.get('critique')}")
    
    # 4. Step 2: Style Tuner (The "Brain")
    print(f"\n🧠 [Step 2] Style Tuner is rewriting the prompt based on feedback...")
    feedback = f"Image is too blurry. {aesthetic.get('critique', 'Lack of details.')}"
    
    print(f"   > Original Prompt: \"{original_prompt}\"")
    print(f"   > Feedback Input: \"{feedback}\"")
    
    new_prompt = tuner.tune(original_prompt, feedback)
    
    print(f"\n✨ [Result] Tuned Prompt:")
    print(f"   \"{new_prompt}\"")
    
    print("--------------------------------------------------")
    if new_prompt != original_prompt and len(new_prompt) > len(original_prompt):
        print("✅ SUCCESS: The AI *actually* thought about the feedback and rewrote the prompt.")
    else:
        print("❌ FAIL: The prompt didn't change meaningfully.")

    # Cleanup
    if os.path.exists(bad_image_path):
        os.remove(bad_image_path)

if __name__ == "__main__":
    verify_thinking()

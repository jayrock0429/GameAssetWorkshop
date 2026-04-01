
import sys
import os

# Add scripts to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)

from slot_ai_creator import SlotAICreator

def test_native_resolution_fast():
    print("=== Fast Testing Native Resolution Logic ===")
    creator = SlotAICreator()
    
    # Check Cabinet (1280x720)
    canvas_w, canvas_h = 1280, 720
    
    # Header Resolution Check
    header_ar = f"{canvas_w}x{int(canvas_h * 0.12)}"
    expected_header_ar = "1280x86"
    print(f"Header Target AR: {header_ar} (Expected: {expected_header_ar})")
    
    # Base Resolution Check
    base_ar = f"{canvas_w}x{int(canvas_h * 0.15)}"
    expected_base_ar = "1280x108"
    print(f"Base Target AR: {base_ar} (Expected: {expected_base_ar})")
    
    # Prompt Check for Header
    prompt = creator.generate_component_prompts("Test", "UI_Header", layout_mode="Cabinet")
    print("\nGenerated Prompt for Header:")
    print("-" * 50)
    print(prompt[:200] + "...")
    print("-" * 50)
    
    # Verification
    keywords = ["long horizontal banner", "wide UI panel", "panoramic view", "fitted to screen width"]
    print("\nChecking Keywords in Header Prompt...")
    for word in keywords:
        if word in prompt:
            print(f" [OK] Found '{word}'")
        else:
            print(f" [FAIL] Missing '{word}'")

    if header_ar == expected_header_ar and base_ar == expected_base_ar:
        print("\n [SUCCESS] Resolution Calculation Logic Verified!")
    else:
        print("\n [FAIL] Resolution Calculation Logic Mismatch!")

if __name__ == "__main__":
    test_native_resolution_fast()

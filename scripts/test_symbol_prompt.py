
import sys
import os

# Add scripts to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)

from slot_ai_creator import SlotAICreator

def test_symbol_prompt_correction():
    print("=== Testing Symbol View Angle Prompt Correction ===")
    creator = SlotAICreator()
    
    # Mock _reason_prompt to simulate AI output
    creator._reason_prompt = lambda info: f"A golden dragon head. Negative prompt: text, watermark"
    
    prompt = creator.generate_component_prompts("Dragon", "Symbol")
    print("\nGenerated Prompt for Symbol:")
    print("-" * 50)
    print(prompt)
    print("-" * 50)
    
    # Verification
    check_positive = ["FRONT VIEW", "STRAIGHT ON", "SYMMETRICAL", "CENTERED"]
    check_negative = ["(isometric:1.5)", "perspective", "tilted", "side view"]
    
    print("\nChecking Positive Constraints...")
    for word in check_positive:
        if word in prompt:
            print(f" [OK] Found '{word}'")
        else:
            print(f" [FAIL] Missing '{word}'")
            
    print("\nChecking Negative Constraints...")
    for word in check_negative:
        if word in prompt:
            print(f" [OK] Found '{word}'")
        else:
            print(f" [FAIL] Missing '{word}'")

if __name__ == "__main__":
    test_symbol_prompt_correction()
